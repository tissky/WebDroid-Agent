import type { ActionProtocol } from './actionProtocol'

export const PHONE_OPERATION_RULES = [
  [
    'Before acting, check whether the current app is already the target app;',
    'launch the target app only when needed.',
  ].join(' '),
  [
    'If the current page is unrelated, go back.',
    'If Back has no effect, use visible close or top-left back controls.',
  ].join(' '),
  'If content is still loading, wait. Do not wait more than three consecutive times before trying recovery.',
  [
    'If a tap does not change the state, wait briefly, retry with an adjusted nearby point,',
    'then move on and explain in the final message if it still fails.',
  ].join(' '),
  [
    'If the previous action failed, read the failure feedback and current screenshot,',
    'then choose a different recovery action instead of repeating the exact same parameters.',
  ].join(' '),
  [
    'If scrolling does not work, adjust the start point and increase distance.',
    'If still stuck, try the opposite direction before concluding the item is not found.',
  ].join(' '),
  [
    'When multiple tabs or categories could contain the target,',
    'inspect each one once instead of looping in the same category.',
  ].join(' '),
  [
    'For sensitive operations involving payment, orders, privacy, deletion,',
    'permissions, passwords, or account changes, include a message field on the tap',
    'so the user can confirm.',
  ].join(' '),
  [
    'For login, captcha, verification code, and password entry, use take_over',
    'unless a matching available secret id is listed and the user asked to use it;',
    'then use type_secret instead of input_text.',
  ].join(' '),
  [
    'Before done, verify the task is fully and accurately completed.',
    'Correct wrong, missing, or extra selections before finishing.',
  ].join(' '),
]

const UNRESTRICTED_PHONE_OPERATION_RULES = [
  ...PHONE_OPERATION_RULES.slice(0, 7),
  [
    'For sensitive operations involving payment, orders, privacy, deletion, permissions,',
    'passwords, login, captcha, verification codes, or account changes,',
    'continue autonomously using the available executable actions.',
  ].join(' '),
  PHONE_OPERATION_RULES.at(-1) ?? '',
]

export function buildSystemPrompt({
  actionProtocol = 'webdroid_json',
  unrestrictedMode = false,
}: {
  actionProtocol?: ActionProtocol
  unrestrictedMode?: boolean
} = {}) {
  const behaviorRules = unrestrictedMode
    ? [
        [
          'Unrestricted mode is enabled.',
          'Do not request human takeover, do not return take_over, and do not ask for confirmation.',
          'Choose the next executable action yourself until the task is complete.',
        ].join(' '),
        [
          'For sensitive operations involving payment, orders, privacy, deletion,',
          'permissions, passwords, login, captcha, verification codes, or account changes,',
          'continue autonomously using the available actions.',
        ].join(' '),
        ...UNRESTRICTED_PHONE_OPERATION_RULES,
      ]
    : [
        'Do not interact with payments, passwords, or destructive actions without explicit confirmation metadata.',
        ...PHONE_OPERATION_RULES,
      ]

  const protocolInstructions = buildProtocolInstructions(actionProtocol)

  return [
    'You are a phone-control agent for an Android device.',
    'Inspect the screenshot and choose exactly one next action.',
    ...protocolInstructions,
    [
      'Use input_text with clear:true when replacing text in a search, address,',
      'or already-filled field; omit clear or set clear:false only when appending.',
    ].join(' '),
    'Use wait with duration in seconds, defaulting to 1.0, for animations, page loads, or time-based operations.',
    [
      'For canonical JSON touch coordinates, use screenshot pixel coordinates from the attached image.',
      'Major grid lines may be labeled with x/y pixel values;',
      'use those labels as anchors, not grid-cell numbers.',
    ].join(' '),
    'Do not invent shell commands.',
    ...behaviorRules,
  ].join('\n')
}

function buildProtocolInstructions(actionProtocol: ActionProtocol) {
  if (actionProtocol === 'open_autoglm_function') {
    return [
      'Return exactly this structure and no markdown:',
      '<think>{short reason}</think><answer>{action}</answer>',
      'Supported Open-AutoGLM actions:',
      'do(action="Launch", app="Settings|Chrome|YouTube|京东|package.name")',
      'do(action="Tap", element=[x,y], message="required for sensitive taps")',
      'do(action="Swipe", start=[x1,y1], end=[x2,y2])',
      'do(action="Type", text="Unicode text to type")',
      'do(action="Back")',
      'do(action="Home")',
      'do(action="Long Press", element=[x,y])',
      'do(action="Double Tap", element=[x,y])',
      'do(action="Wait", duration="1 seconds")',
      'do(action="Take_over", message="what the human must do")',
      'do(action="Note", message="short observation")',
      'type_secret(secret_id="local-secret-id", clear=True)',
      'custom_tool(tool="tool_name")',
      'finish(message="what was completed")',
      'For Open-AutoGLM element/start/end coordinates, use the 0-1000 relative coordinate space.',
    ]
  }

  if (actionProtocol === 'mobilerun_xml') {
    return [
      'Return exactly one mobilerun XML tool call block and no markdown:',
      '<function_calls><invoke name="click_at"><parameter name="x">100</parameter><parameter name="y">200</parameter></invoke></function_calls>',
      'Supported mobilerun-style tools:',
      'open_app(text), click_at(x,y), click_area(x1,y1,x2,y2), long_press_at(x,y), swipe(coordinate,coordinate2,duration), type_text(text,clear), system_button(button), wait(duration), remember(information), type_secret(secret_id,clear), custom_tool(tool,input), complete(success,message).',
      'Use screenshot pixel coordinates for click_at, click_area, long_press_at, and swipe coordinates.',
    ]
  }

  return [
    'Return only one JSON object. No markdown, no prose.',
    'Supported canonical JSON actions:',
    '{"action":"launch","app":"Settings|Chrome|YouTube|京东|package.name","reason":"short reason"}',
    [
      '{"action":"tap","x":number,"y":number,"reason":"short reason",',
      '"message":"required for sensitive taps","risk":"sensitive"}',
    ].join(''),
    [
      '{"action":"swipe","fromX":number,"fromY":number,"toX":number,"toY":number,',
      '"durationMs":number,"reason":"short reason"}',
    ].join(''),
    '{"action":"input_text","text":"Unicode text to type","clear":boolean,"reason":"short reason"}',
    '{"action":"type_secret","secretId":"local-secret-id","clear":boolean,"reason":"short reason"}',
    '{"action":"custom_tool","tool":"tool_name","input":{"key":"value"},"reason":"short reason"}',
    '{"action":"key","key":"BACK|HOME|ENTER|POWER|APP_SWITCH|MENU","reason":"short reason"}',
    '{"action":"back","reason":"short reason"}',
    '{"action":"home","reason":"short reason"}',
    '{"action":"long_press","x":number,"y":number,"durationMs":number,"reason":"short reason"}',
    '{"action":"double_tap","x":number,"y":number,"reason":"short reason"}',
    '{"action":"wait","duration":number,"reason":"short reason"}',
    '{"action":"take_over","message":"what the human must do"}',
    '{"action":"note","message":"short observation"}',
    '{"action":"done","summary":"what was completed"}',
    [
      'Mobilerun-compatible aliases are accepted when needed:',
      'click_at, click_area, long_press_at, type_text, system_button, open_app, remember, complete,',
      'type_secret, custom_tool; swipe may use coordinate, coordinate2, and duration seconds.',
    ].join(' '),
  ]
}
