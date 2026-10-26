import { CheckboxBuilder, LabelBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export function createTextInput(customId: string, labelTitle: string, description: string | null, required: boolean, style: TextInputStyle, maxLength: number | null, minLength: number | null): LabelBuilder {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setRequired(required);

  if (maxLength !== null) input.setMaxLength(maxLength);
  if (minLength !== null) input.setMinLength(minLength);

  const label = new LabelBuilder()
    .setLabel(labelTitle);

  if (description !== null) label.setDescription(description);

  label.setTextInputComponent(input);

  return label;
}

export function createCheckbox(customId: string, labelTitle: string, description: string | null, defaultYes: boolean): LabelBuilder {
  const component = new CheckboxBuilder()
    .setCustomId(customId);

  const yesNoLabel = new LabelBuilder()
    .setLabel(labelTitle)
    .setCheckboxComponent(component);

  if (description !== null) yesNoLabel.setDescription(description);

  return yesNoLabel;
}