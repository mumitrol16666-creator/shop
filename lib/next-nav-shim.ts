export function redirect(url: string) {
  window.location.href = url;
}

export function useRouter() {
  return {
    push: (url: string) => {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    replace: (url: string) => {
      window.history.replaceState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    back: () => window.history.back(),
    forward: () => window.history.forward(),
  };
}

export function usePathname() {
  return window.location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}
