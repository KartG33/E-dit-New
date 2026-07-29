interface CommandButtonProps {
  label: string;
  onClick: () => void;
}

export const CommandButton = ({ label, onClick }: CommandButtonProps) => (
  <button
    onClick={onClick}
    className="command-button"
  >
    {label}
  </button>
);
