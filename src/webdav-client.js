export default class WebdavClient {

  constructor(options) {
    this.url = options.url;
    this.auth = options.auth;
  }

  request(verb, url) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open(verb, url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Authorization', this.auth);
      xhr.addEventListener('load', () => { // FIXME listen other events, too
        if (xhr.status < 200 || xhr.status >= 300) {
          return reject(xhr.response); // FIXME provide more error info
        }
        // TODO maybe use sax parser should the xml be very large
        resolve(xhr.responseXML);
      });
      xhr.send();
    });
  }

  addProp(node, prop) {
    let name = prop.tagName.replace(/^\w+:([\w-]+)$/, '$1'); // remove namespace
    let text = prop.textContent;
    let value;
    if (name === 'getlastmodified') {
        value = Date(text);
    } else if (name === 'getcontentlength') {
      value = parseInt(text);
    } else if (name === 'getcontenttype') {
      value = String(text);
    } else if (name === 'resourcetype') {
      let collection = prop.getElementsByTagName('collection');
      if (collection && collection.length) {
        value = 'folder';
      } else {
        value = 'file';
      }
    } else {
      value = undefined; // ignore other props for now
    }
    if (value) {
      node[name] = value;
    }
  }

  *parseProps(xml) {
    for (let i = 1; i < xml.childNodes.length; i++) { // skip the first element, I do not need it
      let xmlnode = xml.childNodes.item(i);
      let node = {};
      node.href = xmlnode.getElementsByTagName('href')[0].textContent;
      let props = xmlnode.getElementsByTagName('prop')[0];
      for (let j=0; j<props.childNodes.length; j++) {
        let prop = props.childNodes.item(j);
        this.addProp(node, prop);
      }
      yield node;
    }
  }

  propfind(props=['allprop'], url='') {
    return new Promise((resolve, reject) => {
      let fullUrl = this.url + url; // FIXME url munge base and passed
      this.request('PROPFIND', fullUrl)
      .then((responseXML) => {
        let root = responseXML.getElementsByTagName('multistatus')[0];
        let nodeIterator = this.parseProps(root);
        resolve(nodeIterator);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}
