// The only persisted UI preference. Never store source or conversation data.
export const THEME_KEY = "talk-to-document-theme-v1";
export const themeBootstrap = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch{}`;
