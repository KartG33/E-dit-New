import { PresetsTab } from './PresetsTab';

interface PresetsCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
}

export const PresetsCommands = ({ applyCommand }: PresetsCommandsProps) => (
  <div className="w-full">
    <PresetsTab applyCommand={applyCommand} />
  </div>
);
