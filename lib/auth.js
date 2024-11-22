const auth = {
  setCredentials(data) {
    data.expires_at = new Date().getTime() + data.expires;
    localStorage.setItem("directus_credentials", JSON.stringify(data));
  },

  getCredentials() {
    const auth = localStorage.getItem("directus_credentials");
    return auth ? JSON.parse(auth) : null;
  },

  clearCredentials() {
    localStorage.removeItem("directus_credentials");
  },
};

export default auth;
