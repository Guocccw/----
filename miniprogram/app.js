const { ENV_ID } = require('./constants/config');
const api = require('./core/api');
const store = require('./core/store');
const session = require('./core/session');

App({
  globalData: {
    user: null,
    activeRoom: null,
    loginReady: null,
    loginError: null,
  },

  onLaunch() {
    if (!wx.cloud) {
      this.globalData.loginError = new Error('当前微信版本不支持云开发');
      return;
    }
    const options = { traceUser: true };
    if (ENV_ID) options.env = ENV_ID;
    try {
      wx.cloud.init(options);
    } catch (err) {
      this.globalData.loginError = err;
      return;
    }

    this.globalData.loginReady = this.login().catch((err) => {
      this.globalData.loginError = err;
      throw err;
    });
  },

  async login() {
    const data = await api.call('auth.login');
    store.setUser(data.user);
    store.setActiveRoom(data.activeRoom || null);
    session.setActiveRoom(data.activeRoom || null);
    this.globalData.user = data.user;
    this.globalData.activeRoom = data.activeRoom || null;
    this.globalData.loginError = null;
    return data;
  },

  async ensureLogin() {
    if (this.globalData.user) return this.globalData.user;
    if (!this.globalData.loginReady) {
      this.globalData.loginReady = this.login();
    }
    return this.globalData.loginReady;
  },

  async retryLogin() {
    this.globalData.loginError = null;
    this.globalData.loginReady = this.login();
    return this.globalData.loginReady;
  },
});
