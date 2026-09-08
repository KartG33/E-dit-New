import { createContext, useContext } from 'react';

export const ActionContext = createContext({
  title: (_id: string, label: string) => label,
  run: undefined as ((id: string) => void) | undefined,
});
export const useActions = () => useContext(ActionContext);
