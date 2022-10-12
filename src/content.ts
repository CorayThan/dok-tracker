const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {

        const gameChat = document.querySelector(".gamechat")

        if (gameChat != null) {
            addLinks(gameChat)

            const continuePlayingButton = document.querySelector<HTMLButtonElement>("button[title=\"Continue Playing\"]")
            const reportGameButton = document.querySelector<HTMLButtonElement>("button[title=\"Report Game\"]")
            const viewReportButton = document.querySelector<HTMLButtonElement>("button[title=\"View Game Report\"]")
            if (continuePlayingButton != null) {
                reportWin(gameChat, continuePlayingButton, reportGameButton, viewReportButton)
            }
        }

    }
})

observer.observe(document, {childList: true, subtree: true})

interface GameReport {
    playerOne: string
    playerOneDeckId: string
    playerTwo: string
    playerTwoDeckId: string
    messages: string[]
}

const filterMessagesBy = [
    "has connected to the",
    "has disconnected.",
    "has reconnected",
    "Compare Decks"
]

let firstWinReport = true
let lastReportTime = 0

let lastReportSent = ""

const reportWin = (gameChat: Element, continueButton: HTMLButtonElement, reportButton: HTMLButtonElement | null, viewReportbutton: HTMLButtonElement | null) => {

    if (reportButton != null || viewReportbutton != null) {
        console.log("Skip building report, it's already done.")
        return
    }

    const systemMessages = gameChat.querySelectorAll(".message:not(.chat-bubble)")
    const readableMessages: string[] = []
    let foundWinner = false
    systemMessages.forEach(message => {
        if (!foundWinner) {
            const spans: NodeListOf<HTMLElement> = message.querySelectorAll("div > span, a")
            let rawMessage = ""
            spans.forEach(span => {
                const toAdd = span.innerText.trim()
                if (toAdd.length > 0) {
                    rawMessage += (span.innerText.trim() + " ")
                }
                // if (firstWinReport) {
                //     console.log(`building message: '${rawMessage}'`)
                // }
            })
            rawMessage = rawMessage.trim()
            if (rawMessage.length > 0 && filterMessagesBy.find(toFilter => rawMessage.includes(toFilter)) == null) {

                rawMessage = rawMessage.replace(" card s ", " cards ")
                rawMessage = rawMessage.replace(" 's ", "'s ")
                rawMessage = rawMessage.replace("  ", " ")

                readableMessages.push(rawMessage)
                if (rawMessage.includes("has won the game")) {
                    foundWinner = true
                }
            }
        }
    })

    firstWinReport = false
    const now = Date.now()
    const millisSinceLastReport = now - lastReportTime

    const noReportWithin5Sec = millisSinceLastReport > 5000

    const gameReport: GameReport = {
        playerOne: playerFromMessage(readableMessages[0]),
        playerOneDeckId: deckFromMessage(systemMessages.item(0)),
        playerTwo: playerFromMessage(readableMessages[1]),
        playerTwoDeckId: deckFromMessage(systemMessages.item(1)),
        messages: readableMessages.slice(2)
    }
    const stringGameReport = JSON.stringify(gameReport)

    if (readableMessages.length > 1 && noReportWithin5Sec && lastReportSent !== stringGameReport) {

        lastReportSent = stringGameReport
        console.log("Sending gamereport!")

        lastReportTime = now
        chrome.runtime.sendMessage(
            {type: "report-game", gameReport},
        )

        const reportButton = document.createElement("button")
        reportButton.setAttribute("title", "View Games")
        reportButton.innerText = "View Games"
        reportButton.classList.add("btn", "btn-default", "prompt-button", "btn-stretch")
        reportButton.onclick = () => {
            window.open("https://decksofkeyforge.com/games-tracker/search", "_blank")?.focus()
        }
        const buttonsParent = continueButton.parentNode
        buttonsParent?.insertBefore(reportButton, continueButton)

    }
}

const playerFromMessage = (message: string) => {
    return message.slice(0, message.indexOf("brings")).trim()
}
const deckFromMessage = (message: Element) => {
    const deckLink = message.querySelector<HTMLAnchorElement>("a")?.href
    if (deckLink != null) {
        return deckLink.slice(deckLink.lastIndexOf("/") + 1)
    }
    throw Error("No deck available when it should be available.")
}

const addLinks = (gameChat: Element) => {
    const messagesLinks = gameChat.querySelectorAll(".message > a")

    let foundCompare = false

    const deckIds: string[] = []
    let lastLink: HTMLAnchorElement | undefined
    messagesLinks.forEach(node => {

        const link = node as HTMLAnchorElement

        const nodeHref = link.href

        if (nodeHref != null && nodeHref.startsWith("https://decksofkeyforge.com/compare-decks")) {
            foundCompare = true
        }

        if (nodeHref != null && nodeHref.startsWith("https://www.keyforgegame.com/deck-details/")) {
            const deckId = nodeHref.slice(nodeHref.lastIndexOf("/") + 1)
            deckIds.push(deckId)

            link.href = "https://decksofkeyforge.com/decks/" + deckId

            console.log("Replacing " + nodeHref + " with " + link.href)

            lastLink = link
        }


    })

    if (lastLink != null && !foundCompare && deckIds.length > 1) {

        const compareDiv = document.createElement("div")
        compareDiv.classList.add("message")
        compareDiv.classList.add("mg-1")

        const compareLink = document.createElement("a")
        compareLink.innerHTML = "Compare Decks"
        compareLink.href = "https://decksofkeyforge.com/compare-decks?decks=" + deckIds[0] + "&decks=" + deckIds[1]
        compareLink.target = "_blank"
        compareLink.rel = "noopener noreferrer"

        compareDiv.appendChild(compareLink)

        const secondLinkParent = lastLink.parentNode

        secondLinkParent?.parentNode?.insertBefore(compareDiv, secondLinkParent.nextSibling)

        console.log("Adding compare link " + compareLink.href)
    }
}