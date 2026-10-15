import { Banner } from './SampleRecipes';
export type StatusBandKind = 'blocking' | 'degraded';
export interface StatusBandProps {
  kind: StatusBandKind;
  message: string;
  actionLabel: string;
  onAction: () => void;
  isDark: boolean;
  testID?: string;
}
export function StatusBand({ kind, ...props }: StatusBandProps) {
  return (
    <Banner
      {...props}
      kind={kind === 'blocking' ? 'error' : 'warning'}
      inline
    />
  );
}
