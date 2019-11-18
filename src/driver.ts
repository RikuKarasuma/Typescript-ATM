/**
 * Instance to represent a bunch of Pound Notes.
 */
interface Notes
{
    five: number;
    ten: number;
    twenty: number;
}

/**
 * Used to prevent input from occuring once a timed message is being displayed.
 */
let messageTimerOn = false;

/**
 * Pin entered by the user in order to login.
 */
let pin: string = "";

/**
 * Amount of cash entered by the user to withdraw.
 */
let toWithdraw: string = "";

/**
 * Current balance the user has. Is updated by URL endpoint on login.
 */
let balance: number = 0;

/**
 * Informs the ATM and some functions that we are either on the login screen
 * or the withdrawal screen.
 */
let loginScreen = true;

/**
 * The total amount of cash a user has after withdrawing.
 */
let userAmount = 0;

/**
 * Balance the user had when they first logged in.
 */
let initialBalance = 0;

/**
 * The total overdraft amount a user can exceed after balance.
 */
const overdraftLimit: number = 100;

/**
 * The terminal message which is updated by the ATMs functions. Informs the user
 * on the current task.
 */ 
const terminalMessenger: HTMLElement = document.getElementById("terminal-message");

/**
 * Closure for the true balance after summing overdraft limit.
 */
const trueBalance = () => balance + overdraftLimit;

/**
 * Total notes available within the ATM.
 */
const availableNotes = {five: 4, ten: 15, twenty: 7};

/**
 * Notes that the user has withdrawn.
 */
const userNotes = {five: 0, ten: 0, twenty: 0};

/**
 * Message which informs the user that no more digits can be inserted.
 */
const insertionError = "No more can be inserted!!";

/**
 * Pin status text. Represents the length of the entered pin as Astrisks.
 */
const pinMessage = () => "Pin: " + pinToAstrisk();

/**
 * Withdrawal status text. Shows the balance with overdraft. Also displays 
 * amount in overdraft.
 */
const withdrawalMessage = () => 
{
    if(balance < 0) 
        return "Overdraft: " + (userAmount - initialBalance)  + " | Balance: " + trueBalance() + " | Amount to withdraw: " + toWithdraw;
    else
        return "Balance: " + trueBalance() + " | Amount to withdraw: " + toWithdraw;
}

/**
 * Controls the input flow. Either towards inserting a PIN or an ammount to withdraw.
 * @param digit - Subsequent digit for pin/withdraw amount.
 */
const inputManager = (digit: string) =>
{
    // If we are still on the login screen...
    if(loginScreen)
        // Keep inserting pin numbers.
        pinInserter(digit);
    // If we have already logged in...
    else
        // Keep inserting withdrawal numbers.
        withdrawalInserter(digit);
}

/**
 * Closure to insert pin number into the pin global and set the terminal pin message.
 * 
 * @param digit - Next pin digit inserted by the user. 
 */
const pinInserter = (digit: string) => 
{
    if(digit.length == 1 && pin.length < 4 && !messageTimerOn)
    {
        pin += digit;
        terminalMessenger.textContent = pinMessage();
        console.log("New pin:" + pin);
    }
    else
        displayTimedMessage(insertionError, pinMessage());
}

/**
 * Inserts the next digit for the withdrawal amount.
 * @param digit - Next digit to make up the withdrawal amount.
 */
const withdrawalInserter = (digit: string) =>
{
    if(digit.length == 1 && toWithdraw.length < 5 && !messageTimerOn)
    {
        toWithdraw += digit;
        terminalMessenger.textContent = withdrawalMessage();
    }
    else
        displayTimedMessage(insertionError, withdrawalMessage());
}

/**
 * Closure to remove a wrongly inserted pin number, then updates terminal message. 
 */
const digitRemover = () =>
{
    const deletionError = "No more can be deleted!!";
    if(loginScreen)
    {
        if(pin.length > 0 && !messageTimerOn)
        {
            pin = pin.substring(0, pin.length - 1);
            terminalMessenger.textContent = pinMessage();
        }
        else 
            displayTimedMessage(deletionError, pinMessage());
    }
    else
    {
        if(toWithdraw.length > 0 && !messageTimerOn)
        {
            toWithdraw = toWithdraw.substring(0, toWithdraw.length - 1);
            terminalMessenger.textContent = withdrawalMessage();
        }
        else 
            displayTimedMessage(deletionError, withdrawalMessage());
    }
}

/**
 * Displays a message to a user for a couple of seconds. Then returns to the previous
 * message.
 * 
 * @param message - Message to temporarily display to the user.
 * @param default_message - Text to return to after displaying message to user.
 */
const displayTimedMessage = (message: string, default_message: string) => 
{
    if(!messageTimerOn)
    {
        messageTimerOn = true;
        const returnToDefaultTime = 2000;
        terminalMessenger.textContent = message;
        setTimeout(() => 
        {
            terminalMessenger.textContent = default_message;
            messageTimerOn = false;
        }, returnToDefaultTime);
    }
}

/**
 * Decides the flow of the user input. Depending on whether the user is on the Login
 * screen or Withdrawal screen. Displays error messages appropriate to the user input.
 */
function attemptUserInput()
{
    // If we are on the Login screen.
    // Attempt to login and retrieve the balance...
    if(loginScreen)
    {
        if(login(pin))
        {
            loginScreen = false;
            displayTimedMessage("PIN correct!", withdrawalMessage());
        }
        else 
        {
            pin = "";
            displayTimedMessage("PIN incorrect!", pinMessage());
        }
    }
    // If we are on the withdrawal screen.
    // Attempt to dispense notes matching the required amount...
    else
    {
        // Cast our string amount to integer.
        const castedWithdrawalAmount = parseInt(toWithdraw);
        // Make sure we have enough before withdrawal attempt...
        if(castedWithdrawalAmount <= trueBalance())
        {
            // Calculate that we got enough notes...
            const enoughCashPresent = haveEnoughCash(castedWithdrawalAmount);
            // Verify that the amount is divisible by our common denominator and
            // that enough notes are present to complete the withdrawal...
            if(castedWithdrawalAmount % 5 == 0 && enoughCashPresent)
            {
                withdraw(castedWithdrawalAmount);
                toWithdraw = "";
                displayTimedMessage("Withdrawn: " + castedWithdrawalAmount, withdrawalMessage());
            }
            // If we don't got enough notes, inform the user...
            else if(!enoughCashPresent)
            {
                toWithdraw = "";
                displayTimedMessage("Not enougth notes present!", withdrawalMessage());
            }
            // If we can't dispense that denomination, inform the user...
            else 
            {
                toWithdraw = "";
                displayTimedMessage("Can't dispense that denomination!!", withdrawalMessage());
            }
        }
        // If the user doesn't have enough in their account, inform them...
        else 
        {
            toWithdraw = "";
            displayTimedMessage("Not enough in Account!", withdrawalMessage());
        }
    }
}

/**
 * Logs in the user by passing their pin to the url for verification.
 * If correct the endpoint returns the user balance.
 * 
 * @param pin - Pin number entered into ATM by user.
 * @returns true if the user has enter correct pin, false otherwise.
 */
function login(pin: string)
{
    // Indicates whether the pin was correct once passed to the verification url.
    let valid = false;
    // AJAX for http post call.
    const request = new XMLHttpRequest();
    // Set post verb and target url.
    // Also set async to false so that the connection blocks.
    request.open("POST", "https://frontend-challenge.screencloud-michael.now.sh/api/pin/", false);
    // Set contect type as json.
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    // Set our callback function.
    request.onreadystatechange =  function () { 
        // If status is 200 = OK
        // Set balance to retrieved balance
        if (request.readyState == 4 && request.status == 200) {
            // Create object from retrieved json.
            var json = JSON.parse(request.responseText);
            // Set the balance the user has from the retrieved balance figure.
            balance = json.currentBalance;
            initialBalance = balance;
            // Indicate that the login was successful.
            valid = true;
        }
    }
    // Create JSON string from object.
    const postJSON = JSON.stringify({"pin": pin})
    // Make request.
    request.send(postJSON);

    return valid;
}

/**
 * Withdraws a batch of notes from the total balance plus overdraft limit. Then
 * updates the globals and html stats panel.
 * 
 * @param amount_to_withdraw - Number Pounds to withdraw from ATM.
 */
function withdraw(amount_to_withdraw: number)
{
    let trueBalance: number = balance + overdraftLimit;

    if(amount_to_withdraw > 0 && amount_to_withdraw <= trueBalance)
    {
        // Calculate the number of notes to dispense and the total 
        // amount withdrawn.
        const batchOfNotes = getDenominationsNeeded(amount_to_withdraw);
    
        // Update user and atm globals.
        updateUserStats(batchOfNotes);
        // Update html panel containing notes and total.
        updateStatsPanel();
    }
}

/**
 * Attempts to return an even number of denominations and if fails, uses whichever notes
 * are left to make up the shortfall. Returns the number of notes which are given to the 
 * user.
 * @param amount - Amount to withdraw.
 * @returns Notes object containing the number of 20, 10 and 5 pound notes need to make
 * up the input amount.
 */
function getDenominationsNeeded(amount: number)
{
    const denominations = [20, 10, 5];
    const notesAvailable = [availableNotes.twenty, availableNotes.ten, availableNotes.five];
    const totalNotes = availableNotes.twenty + availableNotes.ten + availableNotes.five;
    const noteLimits = [amount / totalNotes, amount / totalNotes, amount / totalNotes]
    const notesNeeded = [0, 0, 0];

    // iterate through each denomination.
    for(let i = 0; i < denominations.length; i ++)
        // count each one required until amount is zero.
        while(amount >= denominations[i] && notesAvailable[i] > 0 && notesNeeded[i] < noteLimits[i])
        {
            notesNeeded[i] ++;
            notesAvailable[i] --;
            amount -= denominations[i];
        }

    // If we still haven't enough notes for dispensing, reiterate until we have enough...
    if(amount != 0)
        // iterate through each denomination.
        for(let i = 0; i < denominations.length; i ++)
        // count each one required until amount is zero.
        while(amount >= denominations[i] && notesAvailable[i] > 0)
        {
            notesNeeded[i] ++;
            notesAvailable[i] --;
            amount -= denominations[i];
        }

    // Update the global notes available
    availableNotes.twenty = notesAvailable[0];
    availableNotes.ten = notesAvailable[1];
    availableNotes.five = notesAvailable[2];

    // Return as a Notes object.
    return {twenty: notesNeeded[0], ten: notesNeeded[1], five: notesNeeded[2]};
}

/**
 * Updates the ATM balance and the user notes.
 * @param notesWithdrawn - Notes withdrawn this withdrawal.
 */
function updateUserStats(notesWithdrawn: Notes)
{
    // Calcualate amount withdrawn by denomination of notes.
    const totalWithdrawn = (notesWithdrawn.five * 5) + (notesWithdrawn.ten * 10) + (notesWithdrawn.twenty * 20);
    // Update the balance.
    balance -= totalWithdrawn;
    // Update the amount the user has.
    userAmount += totalWithdrawn;

    // Update the number of notes the user has.
    userNotes.five += notesWithdrawn.five;
    userNotes.ten += notesWithdrawn.ten;
    userNotes.twenty += notesWithdrawn.twenty;
}

/**
 * Updates the number of notes and total balance that the user sees.
 */
function updateStatsPanel()
{
    document.getElementById('twenty-notes').textContent = "£20 notes: " + userNotes.twenty;
    document.getElementById('ten-notes').textContent = "£10 notes: " + userNotes.ten;
    document.getElementById('five-notes').textContent = "£5 notes:  " + userNotes.five;
    document.getElementById('total').textContent = "Total:   " + userAmount;
}

/**
 * Creates a string of astrisks to place in the user message screen.
 * @returns String of astrisks representing Pin length.
 */
function pinToAstrisk()
{
    let astrisks = "";
    for(let i = 0;i < pin.length; i ++)
        astrisks += "*";

    return astrisks;
}

/**
 * Using the remaining Pound Notes. The total remaining cash inside the ATM
 * is returned.
 * @returns Total cash remaining inside ATM.
 */
function calculateTotalRemainingCash()
{
    return (availableNotes.five * 5) + (availableNotes.ten * 10) + (availableNotes.twenty * 20);
}

/**
 * Retrieves whether the ATM is empty of cash or not.
 * @returns True if ATM is empty of cash.
 */
function isATMEmpty()
{
    return calculateTotalRemainingCash() == 0;
}

/**
 * Compares the amount to withdraw to the total amount of cash present
 * insisde the ATM.
 * @param to_withdraw - Amount to withdraw. 
 */
function haveEnoughCash(to_withdraw: number)
{
    return to_withdraw <= calculateTotalRemainingCash();
}