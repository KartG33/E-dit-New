import { useActions } from '../Shortcuts/ActionContext';

interface CommandButtonProps {
  label: string;
  onClick: () => void;
  actionId?: string;
}

export const CommandButton = ({ label, onClick, actionId }: CommandButtonProps) => {
  const { title, run } = useActions();
  return (
  <button
    onClick={actionId && run ? () => run(actionId) : onClick}
    title={actionId ? title(actionId, label) : label}
    className="command-button"
  >
    {label}
  </button>
  );
};
