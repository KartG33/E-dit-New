import { PresetsTab } from './PresetsTab';

interface PresetsCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
}

export const PresetsCommands = ({ applyCommand }: PresetsCommandsProps) => (
  <div className="ui-command-row">
    <PresetsTab applyCommand={applyCommand} />
  </div>
);
