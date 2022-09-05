import axios, { Axios, AxiosRequestHeaders } from "axios";
import { URLSearchParams } from "url";

interface SaltConfig {
  url: string;
  username?: string;
  password?: string;
  token?: string;
  eauth?: string;
}

interface FunOptions {
  client?: "local" | "runner" | "wheel";
  arg?: string | string[];
  kwarg?: any;
  tgt_type?: "glob" | "pcre" | "list" | "grain" | "grain_pcre" | "pillar" | "pillar_pcre" | "nodegroup" | "range" | "compound" | "ipcidr";
  pillar?: string;
  timeout?: number;
  full_return?: boolean;
}

export class Salt {
  config: SaltConfig = {
    url: "http://localhost:8000",
    eauth: "pam",
  };
  headers: AxiosRequestHeaders = {
    Accept: "application/json",
  };
  axios: Axios;
  debug: boolean;

  private token: string;
  private expire;

  constructor(config: SaltConfig, debug = false, axiosInstance: Axios | undefined = undefined) {
    this.config = config;
    this.debug = debug;
    if (typeof axiosInstance === "undefined") {
      this.axios =
        axiosInstance ||
        axios.create({
          headers: {
            Accept: "application/json",
          },
        });
    }

    if (this.debug) {
      // Set request startTime
      this.axios.interceptors.request.use(
        function (config: any) {
          config.metadata = { startTime: new Date() };
          return config;
        },
        function (error) {
          return Promise.reject(error);
        },
      );

      // Set request endTime and calculate duration
      this.axios.interceptors.response.use(
        function (response: any) {
          response.config.metadata.endTime = new Date();
          response.duration = response.config.metadata.endTime - response.config.metadata.startTime;
          return response;
        },
        function (error) {
          error.config.metadata.endTime = new Date();
          error.duration = error.config.metadata.endTime - error.config.metadata.startTime;
          return Promise.reject(error);
        },
      );
    }
  }

  async login(): Promise<void> {
    const form: { [key: string]: any } = {
      eauth: typeof this.config.eauth === "string" ? this.config.eauth : "pam",
    };
    if (typeof this.config.username !== "undefined") form.username = this.config.username;
    if (typeof this.config.password !== "undefined") form.password = this.config.password;
    if (typeof this.config.token !== "undefined") form.token = this.config.token;

    const response = await this.axios.post(this.config.url + "/login", new URLSearchParams(form), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    this.debugLog({ url: this.config.url, path: "/login" }, response);

    const data = response.data;
    if (typeof data === "object" && typeof data.return === "object" && typeof data.return[0].token === "string") {
      this.token = data.return[0].token;
      this.expire = data.return[0].expire;
    } else {
      throw "Got no token";
    }
  }

  async fun(tgt = "*", fun: string | string[] = "test.ping", funOptions: FunOptions = undefined): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      // Debug log
      this.debugLog({ function: "fun", log: "Token expired, logging in again" });
      // Token expired, logging in again
      await this.login();
    }
    const form: { [key: string]: any } = { tgt, fun, client: "local" };
    if (funOptions?.client) form.arg = funOptions.client;
    if (funOptions?.arg) form.arg = funOptions.arg;
    if (funOptions?.kwarg) form.kwarg = funOptions.kwarg;
    if (funOptions?.tgt_type) form.tgt_type = funOptions.tgt_type;
    if (funOptions?.pillar) form.pillar = funOptions.pillar;
    if (funOptions?.timeout) form.timeout = funOptions.timeout;
    return this.axios
      .post(this.config.url, form, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        this.debugLog(form, response);
        return response.data;
      })
      .catch((err) => {
        this.debugLog(form, undefined, err);
        throw err;
      });
  }

  async minions(mid = ""): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      this.debugLog({ path: "/minions", mid, log: "Token expired, logging in again" });
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/minions/${mid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        this.debugLog({ path: "/minions", mid }, response);
        return response.data;
      })
      .catch((err) => {
        this.debugLog({ path: "/minions", mid }, undefined, err);
        throw err;
      });
  }

  async jobs(jid = ""): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      this.debugLog({ path: "/jobs", jid, log: "Token expired, logging in again" });
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/jobs/${jid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        this.debugLog({ path: "/jobs", jid }, response);
        return response.data;
      })
      .catch((err) => {
        this.debugLog({ path: "/jobs", jid }, undefined, err);
        throw err;
      });
  }

  /**
   * Debug log, if debug is enabled logs requests with duration to console
   * @param debugObject containing error to log
   * @param response object
   * @param error object
   */
  private debugLog(debugObject: any, response: any = undefined, error: any = undefined): void {
    if (!this.debug) return;

    if (response) debugObject.duration = response.duration / 1000;
    if (error) {
      debugObject.duration = error.duration / 1000;
      console.log(`[NODE-SALT-API] ${error.message}`);
    }
    console.log("[NODE-SALT-API]");
    console.log(debugObject);
  }
}
