export const notify = (message: string, error = false) => {
  window.dispatchEvent(new CustomEvent(error ? 'app-error' : 'app-notice', { detail: message }));
};
