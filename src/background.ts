const url = "https://decksofkeyforge.com"

console.log("Record game events file")

try {

    chrome.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            console.log("on message")
            if (request.type === "report-game") {

                const jsonReport = JSON.stringify(request.gameReport)
                const sendToUrl = url + "/api/games-tracker/report-game"

                console.log("Sending report game request? url: " + sendToUrl)
                console.log(jsonReport, 0, 2)
                fetch(
                    sendToUrl,
                    {
                        method: "POST",
                        mode: "cors",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: jsonReport
                    }
                ).then(response => {
                    console.log(`Sent game report! response code ${response.status} value ${response.statusText}`)
                }).catch(error => {
                    console.log("Game report send failed :(")
                })

            }
            return true
        }
    )

} catch (e) {
    console.log("Total failure in background script due to error", e)
}
