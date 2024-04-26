import { baseUrl, prems, url1, url1Key, url2, url2Query, onBeforeSendHeadersOptions, createCurrentDataTask, runCurrentDataTask, sendMessage, addSendHeaders, sendHeadersHas, createDataMp, dataURLtoBlob } from "./utils/index.js"

let isAutoGenerateXmlHeader = true

console.log(chrome, Date.now());

class NationalPushAPI {
    constructor(args) {
        this.baseUrl = args.baseUrl
    }

    login(message) {
        fetch(this.baseUrl + "/login", {
            method: "POST",
            body: JSON.stringify({
                info: message.info,
                items: message.items,
                allItems: message.allItems,
                username: message.nickname,
                password: message.password,
                captcha: message.captcha
            }),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).then(res => {
            sendMessage({
                type: "LOGINRESPONSE", message: {
                    code: 200, data: res
                }
            })
        }).catch(err => {
            sendMessage({
                type: "LOGINRESPONSE", message: {
                    code: 500
                }
            })
        })
    }

    loginStatus(message) {
        fetch(this.baseUrl + "/loginstatus", {
            method: "POST",
            body: JSON.stringify({
                info: message.info,
                items: message.items,
                allItems: message.allItems,
                nickname: message.account,
                password: message.password
            }),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).then(res => {
            sendMessage({
                type: "LOGINSTATUSRESPONSE", message: {
                    code: 200, data: res
                }
            })
        }).catch(err => {
            sendMessage({
                type: "LOGINSTATUSRESPONSE", message: {
                    code: 500
                }
            })
        })
    }

    //推送
    pushStatus(message) {
        const files = message.files
        const formData = new FormData()
        if (files) {
            for (let w = 0; w < files.length; w++) {
                formData.append('file', dataURLtoBlob(files[w]))
            }
        }
        formData.append("sampleNumber", message.sampleNumber)
        formData.append("id", message.id)
        formData.append("pushCommand", message.flag)
        formData.append("processId", message.processId)
        formData.append("uuid", message.uuid)
        fetch(loginstatusUrl + "/pushdata", {
            method: "POST",
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.json()).then(res => {
            sendMessage({
                type: "PUSHSTATUSRESPONSE", message: {
                    code: 200, data: res, id: message.id
                }
            })
        }).catch(err => {
            sendMessage({
                type: "PUSHSTATUSRESPONSE", message: {
                    code: 500
                }
            })
        })
    }

    //切换数据时，取消推送
    cancelPush(message) {

        fetch(this.baseUrl + `/destroy/${message.uid}`, {
            method: "GET",
        }).then((res) => {
            console.log(res);
        })
    }
}

export default NationalPushAPI

function onBeforeSendHeadersListener(res) {
    if (res.type === "xmlhttprequest") {
        for (let w of [url1, url2]) {
            if (res.url.startsWith(w)) {
                const requestHeaders = res.requestHeaders
                const headers = {}
                for (let w of requestHeaders) {
                    headers[w.name] = w.value
                }
                addSendHeaders(w, {
                    headers,
                    method: "post" || res.method,
                })
            }
        }
    }
}

function autoGenerateXmlHeader(flag) {
    if (isAutoGenerateXmlHeader) {
        flag && onBeforeSendHeadersListener({
            url: url1,
            requestHeaders: [{ value: "123", name: 'isToken' }],
            type: 'xmlhttprequest'
        })
        !flag && setTimeout(() => {
            onBeforeSendHeadersListener({
                url: url2,
                requestHeaders: [{ value: "123", name: 'isToken' }],
                type: 'xmlhttprequest'
            })
        }, 1000)
    }
}
autoGenerateXmlHeader(1)

// 添加请求完成的监听器
chrome.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeadersListener,
    ...onBeforeSendHeadersOptions
);


let currentDataId = null

function setCurrentDataId(id) {

    const { addOverXMLNum } = createDataMp(id)

    currentDataId = id

    for (let w of [url1, url2]) {
        createCurrentDataTask(() => {
            if (sendHeadersHas(w)) {
                addOverXMLNum(w === url1 ? 1 : 2)
                return true
            }
        })
    }
    runCurrentDataTask()
    autoGenerateXmlHeader(0)
}

const loginstatusUrl = ("http://labhub-fsp.cpolar.cn")

const nationalPushAPI = new NationalPushAPI({
    baseUrl : loginstatusUrl
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request, 'background');
    const message = request.message;
    switch (request.type) {
        case 'TABLECLICK':
            setCurrentDataId(request.id)
            break
        case "LOGIN":
            nationalPushAPI.login(message)
            break
        case "LOGINSTATUS":
            nationalPushAPI.loginStatus(message)
            break
        case "PUSHSTATUS":
            nationalPushAPI.pushStatus(message)
            break
        case "CANCELPUSH":
            nationalPushAPI.cancelPush(message)
            break
    }
});
