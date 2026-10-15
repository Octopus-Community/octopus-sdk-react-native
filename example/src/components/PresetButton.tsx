import { PillButton } from './PillButton';
export interface PresetButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  isDark: boolean;
  disabled?: boolean;
  loading?: boolean;
}
/** Presets share the secondary capsule recipe and stretch in the scenario bench. */
export function PresetButton(props: PresetButtonProps) {
  return <PillButton {...props} variant="secondary" fullWidth />;
}
