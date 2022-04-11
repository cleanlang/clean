const createRequest = (method, url, cb) => {
  const request = new window.XMLHttpRequest();
  request.addEventListener("load", () => {
    if (request.status === 200) {
      cb(request);
    } else {
      cb(new Error(request.statusText));
    }
  });
  request.addEventListener("timeout", () => cb(new Error("Request timed out")));
  request.addEventListener("abort", () => cb(new Error("Request aborted")));
  request.addEventListener("error", () => cb(new Error("Request failed")));
  request.open(method, url);
  return request;
};

/* eslint-disable-next-line no-unused-vars, no-undef */
class IO extends IOCore {
  static get(url) {
    return new IO((cb) => {
      const request = createRequest("GET", url, cb);
      request.send();
    }).map((request) => request.responseText);
  }

  static del(url) {
    return new IO((cb) => {
      const request = createRequest("DELETE", url, cb);
      request.send();
    }).map((request) => request.responseText);
  }

  static getJSON(url) {
    return new IO((cb) => {
      const request = createRequest("GET", url, cb);
      request.responseType = "json";
      request.send();
    }).map((request) => [request.response]);
  }

  static delJSON(url) {
    return new IO((cb) => {
      const request = createRequest("DELETE", url, cb);
      request.responseType = "json";
      request.send();
    }).map((request) => [request.response]);
  }

  static getBlob(url) {
    return new IO((cb) => {
      const request = createRequest("GET", url, cb);
      request.responseType = "blob";
      request.send();
    }).map((request) => new window.Blob([request.response]));
  }

  static postJSON(url, obj) {
    return new IO((cb) => {
      const request = createRequest("POST", url, cb);
      request.setRequestHeader("Content-Type", "application/json");
      request.responseType = "json";
      request.send(JSON.stringify(obj));
    }).map((request) => [request.response]);
  }

  static putJSON(url, obj) {
    return new IO((cb) => {
      const request = createRequest("PUT", url, cb);
      request.setRequestHeader("Content-Type", "application/json");
      request.responseType = "json";
      request.send(JSON.stringify(obj));
    }).map((request) => [request.response]);
  }

  static click(elem) {
    return new IO((cb) => elem.addEventListener("click", cb));
  }

  static change(elem) {
    return new IO((cb) => elem.addEventListener("change", cb)).map(
      (e) => e.target.value
    );
  }
}
