import axios, { Axios, AxiosRequestHeaders } from "axios";
import { URLSearchParams } from "url";

interface SaltConfig {
  url: string;
  username?: string;
  password?: string;
  token?: string;
  eauth?: string;
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

    // Debug
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

    // Debug log
    if (this.debug) {
      const req: any = response;
      const debug = { path: "/login", duration: req.duration / 1000 };
      console.log(`[NODE-SALT-API] ${JSON.stringify(debug)}`);
    }

    const data = response.data;
    if (typeof data === "object" && typeof data.return === "object" && typeof data.return[0].token === "string") {
      this.token = data.return[0].token;
      this.expire = data.return[0].expire;
    } else {
      throw "Got no token";
    }
  }

  async fun(tgt = "*", fun = "test.ping", arg: string | string[] = "", kwarg: object | string | string[] = undefined, tgt_type = "", client = "local", pillar = "", timeout: number = undefined): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      // Debug log
      if (this.debug) console.log("[NODE-SALT-API] Token expired, logging in again");
      // Token expired, logging in again
      await this.login();
    }
    const form: { [key: string]: any } = { tgt, fun, client };
    if (arg) form.arg = arg;
    if (kwarg) form.kwarg = kwarg;
    if (tgt_type) form.tgt_type = tgt_type;
    if (pillar) form.pillar = pillar;
    if (timeout) form.timeout = timeout;

    return this.axios
      .post(this.config.url, form, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        // Debug log
        if (this.debug) {
          const req: any = response;
          form.duration = req.duration / 1000;
          console.log("[NODE-SALT-API] fun():");
          console.log(form);
        }
        return response.data;
      })
      .catch((err) => {
        if (this.debug) {
          const req: any = err;
          form.duration = req.duration / 1000;
          console.log("[NODE-SALT-API] fun():");
          console.log(form);
          console.log(`[NODE-SALT-API] ${err.message}`);
        }
        throw err;
      });
  }

  async minions(mid = ""): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      // Debug log
      if (this.debug) console.log("[NODE-SALT-API] Token expired, logging in again");
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/minions/${mid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        // Debug log
        if (this.debug) {
          const req: any = response;
          const debug = { path: "/minions", mid, duration: req.duration / 1000 };
          console.log(`[NODE-SALT-API] ${JSON.stringify(debug)}`);
        }
        return response.data;
      })
      .catch((err) => {
        if (this.debug) {
          const req: any = err;
          const debug = { path: "/minions", mid, duration: req.duration / 1000 };
          console.log(`[NODE-SALT-API] ${JSON.stringify(debug)}`);
          console.log(`[NODE-SALT-API] ${err.message}`);
        }
        throw err;
      });
  }

  async jobs(jid = ""): Promise<any> {
    if ((this.expire <= Date.now() / 1000) as any) {
      // Debug log
      if (this.debug) console.log("[NODE-SALT-API] Token expired, logging in again");
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/jobs/${jid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => {
        // Debug log
        if (this.debug) {
          const req: any = response;
          const debug = { path: "/jobs", jid, duration: req.duration / 1000 };
          console.log(`[NODE-SALT-API] ${JSON.stringify(debug)}`);
        }

        return response.data;
      })
      .catch((err) => {
        // Debug log
        if (this.debug) {
          const req: any = err;
          const debug = { path: "/jobs", jid, duration: req.duration / 1000 };
          console.log(`[NODE-SALT-API] ${JSON.stringify(debug)}`);
          console.log(`[NODE-SALT-API] ${err.message}`);
        }
        throw err;
      });
  }
}
