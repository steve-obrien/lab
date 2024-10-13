# Running

There are 3 individual scripts.

index.js 
plivo.js
realtime.js - realtime uses the open ai realtime client library and does work to merge messages into conversation items with their text transcribed.  This is then logged to a log web socket that the web page listens to.

http://localhost:5050 - to make called.

So media-stream is an endpoint that twilio connects to.
Within this socket we open a websocket to openAI realtime.  This allows us to send server responses from the AI to twilio's socket.
And audio from twilio to the AI's socket.

The browser then listens to a logging socket for the transcription and potential event logs.

Realtime library which is used in `realtime.js` also handles function calling.  And makes this a breeze.

# Challenges

## Interupting the model
OpenAI will send a complete server response very fast.  For example paragraphs of text and the audio.
If you think how fast chatGPT responds.  This means the audio output lags behind.
This makes it hard to interupt - as it has sent the large chunk off twilio.
This needs to be managed better so if a users asks to stop - the audio stream is stopped to twilio.

Currently the implementation has no buffer of its own.  We do recieve the intrupted speach.
And this is even sent to openai.  When we recieve the interuption we need to cancel the response to twilio.
And truncate the message so chatGPT knows the reality of the conversation.

For example:

user: Hello
AI: *Hello, how can I help you today?* I am calling on behalf of company x and wondererd if you would be happy to take my call.
user: Wait

Audio reality:

user: Hello
AI: Hello, how can I help you today?
user: Wait

To do this we probably need to maintain our own buffer.  The realtime client library does manage this, in the browser based example. Through the wavStreamPlayer I believe: [Link to index.js](../openai-realtime-console/src/lib/wavtools/lib/wav_stream_player.js)

It's quite a monstor component.
But the [consolePage.tsx](../openai-realtime-console/src/pages/ConsolePage.tsx) does have a lot of the logic.
This plays back audio in the browser - but the concept is the same and it is much more natural.

The function doing the playback is [consolePage.tsx:610](../openai-realtime-console/src/pages/ConsolePage.tsx)
Line 610:

```typescript
client.on('conversation.updated', async ({ item, delta }: any) => {
	const items = client.conversation.getItems();
	if (delta?.audio) {
		wavStreamPlayer.add16BitPCM(delta.audio, item.id);
	}
	// ...
})
```

Then line 603 processes interuptions:

```typescript
client.on('conversation.interrupted', async () => {
	const trackSampleOffset = await wavStreamPlayer.interrupt();
	if (trackSampleOffset?.trackId) {
		const { trackId, offset } = trackSampleOffset;
		await client.cancelResponse(trackId, offset);
	}
});
```

The wavStreamPlayer is able to return the offset so that cancel response - can later send a truncation messages to ChatGPT.
This is kinda narly and feels like it could be handled directly in the realtime client library - but it is only a beta.



#  Speech Assistant with Twilio Voice and the OpenAI Realtime API (Node.js)

This application demonstrates how to use Node.js, [Twilio Voice](https://www.twilio.com/docs/voice) and [Media Streams](https://www.twilio.com/docs/voice/media-streams), and [OpenAI's Realtime API](https://platform.openai.com/docs/) to make a phone call to speak with an AI Assistant. 

The application opens websockets with the OpenAI Realtime API and Twilio, and sends voice audio from one to the other to enable a two-way conversation.

See [here](https://www.twilio.com/en-us/voice-ai-assistant-openai-realtime-api-node) for a tutorial overview of the code.

This application uses the following Twilio products in conjuction with OpenAI's Realtime API:
- Voice (and TwiML, Media Streams)
- Phone Numbers

## Prerequisites

To use the app, you will  need:

- **Node.js 18+** We used \`18.20.4\` for development; download from [here](https://nodejs.org/).
- **A Twilio account.** You can sign up for a free trial [here](https://www.twilio.com/try-twilio).
- **A Twilio number with _Voice_ capabilities.** [Here are instructions](https://help.twilio.com/articles/223135247-How-to-Search-for-and-Buy-a-Twilio-Phone-Number-from-Console) to purchase a phone number.
- **An OpenAI account and an OpenAI API Key.** You can sign up [here](https://platform.openai.com/).
  - **OpenAI Realtime API access.**

## Local Setup

There are 4 required steps to get the app up-and-running locally for development and testing:
1. Run ngrok or another tunneling solution to expose your local server to the internet for testing. Download ngrok [here](https://ngrok.com/).
2. Install the packages
3. Twilio setup
4. Update the .env file

### Open an ngrok tunnel
When developing & testing locally, you'll need to open a tunnel to forward requests to your local development server. These instructions use ngrok.

Open a Terminal and run:
```
ngrok http 5050
```
Once the tunnel has been opened, copy the `Forwarding` URL. It will look something like: `https://[your-ngrok-subdomain].ngrok.app`. You will
need this when configuring your Twilio number setup.

Note that the `ngrok` command above forwards to a development server running on port `5050`, which is the default port configured in this application. If
you override the `PORT` defined in `index.js`, you will need to update the `ngrok` command accordingly.

Keep in mind that each time you run the `ngrok http` command, a new URL will be created, and you'll need to update it everywhere it is referenced below.

### Install required packages

Open a Terminal and run:
```
npm install
```

### Twilio setup

#### Point a Phone Number to your ngrok URL
In the [Twilio Console](https://console.twilio.com/), go to **Phone Numbers** > **Manage** > **Active Numbers** and click on the additional phone number you purchased for this app in the **Prerequisites**.

In your Phone Number configuration settings, update the first **A call comes in** dropdown to **Webhook**, and paste your ngrok forwarding URL (referenced above), followed by `/incoming-call`. For example, `https://[your-ngrok-subdomain].ngrok.app/incoming-call`. Then, click **Save configuration**.

### Update the .env file

Create a `/env` file, or copy the `.env.example` file to `.env`:

```
cp .env.example .env
```

In the .env file, update the `OPENAI_API_KEY` to your OpenAI API key from the **Prerequisites**.

## Run the app
Once ngrok is running, dependencies are installed, Twilio is configured properly, and the `.env` is set up, run the dev server with the following command:
```
node index.js
```
## Test the app
With the development server running, call the phone number you purchased in the **Prerequisites**. After the introduction, you should be able to talk to the AI Assistant. Have fun!
