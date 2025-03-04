# AI Scheduling

```npm run start```


## Inbound email

Postmark foreards inbound email to meet-ting.ngrok.io
Ngrok then forwards these requests to localhost:3000

```ngrok http --url meet-ting.ngrok.io 3000 ```

Postmark inbound stream:
https://account.postmarkapp.com/servers/48133/streams/inbound/events

## Email

to: ai@newicon.dev
Reply to: ai@meet.newicon.dev

inbound only works with *.newicon.dev