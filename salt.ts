import axios, { Axios, RawAxiosRequestHeaders } from "axios";
import { URLSearchParams } from "url";
import EventSource from "eventsource";

/**
 * Configuration for the Salt-API connection.
 */
interface SaltConfig {
  /** The base URL of the Salt-API, including the scheme and port (e.g., "http://localhost:8000") */
  url: string;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** A pre-existing token for authentication */
  token?: string;
  /** Authentication module to use, defaults to "pam" */
  eauth?: string;
}

/**
 * Options to pass into the `fun()` method to customize execution.
 */
interface FunOptions {
  /** The type of client to use. Defaults to "local". */
  client?: "local" | "runner" | "wheel";
  /** Arguments for the specified function. */
  arg?: string | string[];
  /** Keyword arguments for the specified function. */
  kwarg?: any;
  /** The type of target expression. */
  tgt_type?: "glob" | "pcre" | "list" | "grain" | "grain_pcre" | "pillar" | "pillar_pcre" | "nodegroup" | "range" | "compound" | "ipcidr";
  /** Send specific pillars to the target minion(s). */
  pillar?: string;
  /** Timeout in seconds to wait for the minion to return. */
  timeout?: number;
  /** Whether to return the full payload instead of just the function return value. */
  full_return?: boolean;
}

/**
 * The primary class to interact with a Salt-API instance.
 */
export class Salt {
  config: SaltConfig = {
    url: "http://localhost:8000",
    eauth: "pam",
  };
  headers: RawAxiosRequestHeaders = {
    Accept: "application/json",
  };
  axios: Axios;
  debug: boolean;

  private token: string;
  private expire;

  /**
   * Constructs a new Salt API client instance.
   *
   * @param config The required configuration parameters, including at least `url`.
   * @param debug Enables detailed output and durations to console logs if set to true.
   * @param axiosInstance An optional pre-configured Axios instance to use for API calls.
   *                      Useful for supplying custom agents (e.g., self-signed certificates).
   */
  constructor(config: SaltConfig, debug = false, axiosInstance: Axios | undefined = undefined) {
    this.config = config;
    this.debug = debug;
    if (typeof axiosInstance !== "undefined") {
      this.axios = axiosInstance;
    } else {
      this.axios = axios.create({
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

  /**
   * Log in to the Salt API. Retrieves an authentication token and its expiration
   * based on the provided configuration (username/password or pre-existing token).
   *
   * @throws Throws an error if the authentication response doesn't yield a token.
   * @returns A promise that resolves when the login is successful.
   */
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

    const data = response.data;
    const perms = data?.return?.[0]?.perms;
    this.debugLog({ url: this.config.url, path: "/login", perms }, response);

    if (typeof data === "object" && Array.isArray(data.return) && data.return.length > 0 && typeof data.return[0].token === "string") {
      this.token = data.return[0].token;
      this.expire = data.return[0].expire;
    } else {
      throw new Error("Got no token");
    }
  }

  /**
   * Opens an HTTP stream of the Salt Master Event Bus.
   * Useful for hooking into real-time activity on the Salt Master.
   * Note: The underlying `EventSource` instance will manage the long-running connection.
   *
   * @returns A promise resolving to an `EventSource` instance.
   */
  async eventSource(): Promise<EventSource> {
    if (!this.expire || ((this.expire <= Date.now() / 1000) as any)) {
      this.debugLog({ path: "/events", log: "Token expired, logging in again" });
      // Token expired, logging in again
      await this.login();
    }
    return new EventSource(`${this.config.url}/events`, { headers: { ...(this.headers as any), "X-Auth-Token": this.token } });
  }

  /**
   * Send one or more Salt commands to minions via the API.
   *
   * @param tgt The target of the command (e.g. `*` for all minions, or specific IDs). Defaults to `*`.
   * @param fun The function to run (e.g. `test.ping` or `cmd.run`). Defaults to `test.ping`.
   * @param funOptions Additional options such as kwargs, args, target types, etc.
   * @returns A promise resolving to the data returned from the Salt API.
   */
  async fun(tgt = "*", fun: string | string[] = "test.ping", funOptions: FunOptions = undefined): Promise<any> {
    if (!this.expire || ((this.expire <= Date.now() / 1000) as any)) {
      // Debug log
      this.debugLog({ function: "fun", log: "Token expired, logging in again" });
      // Token expired, logging in again
      await this.login();
    }
    const form: { [key: string]: any } = { tgt, fun, client: "local" };
    if (funOptions?.client) form.client = funOptions.client;
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

  /**
   * List minion information or get details about a specific minion.
   *
   * @param mid The ID of the minion to list details for. If omitted, lists all minions.
   * @returns A promise resolving to the minion data returned from the Salt API.
   */
  async minions(mid = ""): Promise<any> {
    if (!this.expire || ((this.expire <= Date.now() / 1000) as any)) {
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

  /**
   * List executed jobs or get details about a single job from the job cache.
   *
   * @param jid The ID of the job to list details for. If omitted, lists all jobs.
   * @returns A promise resolving to the job data returned from the Salt API.
   */
  async jobs(jid = ""): Promise<any> {
    if (!this.expire || ((this.expire <= Date.now() / 1000) as any)) {
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
   * Debug log: If debugging is enabled, logs requests with their durations to the console.
   *
   * @param debugObject Initial object to log containing contextual details.
   * @param response Optional axios response object.
   * @param error Optional error object.
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
