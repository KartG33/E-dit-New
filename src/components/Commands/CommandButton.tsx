interface CommandButtonProps {
  label: string;
  onClick: () => void;
}

export const CommandButton = ({ label, onClick }: CommandButtonProps) => (
  <button
    onClick={onClick}
    className="py-1 px-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 border border-zinc-200 dark:border-zinc-700/80 rounded-md transition-colors font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs whitespace-nowrap"
  >
    {label}
  </button>
);
