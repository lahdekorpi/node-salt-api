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
  private token: string;
  private expire;

  constructor(config: SaltConfig, axiosInstance: Axios | undefined = undefined) {
    this.config = config;
    if (typeof axiosInstance === "undefined") {
      this.axios =
        axiosInstance ||
        axios.create({
          headers: {
            Accept: "application/json",
          },
        });
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
    const data = response.data;
    if (typeof data === "object" && typeof data.return === "object" && typeof data.return[0].token === "string") {
      this.token = data.return[0].token;
      this.expire = data.return[0].expire;
    } else {
      throw "Got no token";
    }
  }

  async fun(tgt = "*", fun = "test.ping", arg: string | string[] = "", kwarg: object | string | string[] = undefined, tgt_type = "", client = "local", pillar = "", timeout: number = undefined): Promise<any> {
    if (((this.expire <= new Date()) as any) / 1000) {
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
      .then((response) => response.data);
  }

  async minions(mid = ""): Promise<any> {
    if (((this.expire <= new Date()) as any) / 1000) {
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/minions/${mid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => response.data);
  }

  async jobs(jid = ""): Promise<any> {
    if (((this.expire <= new Date()) as any) / 1000) {
      // Token expired, logging in again
      await this.login();
    }
    return this.axios
      .get(`${this.config.url}/jobs/${jid}`, {
        headers: { ...this.headers, "X-Auth-Token": this.token },
      })
      .then((response) => response.data);
  }
}
