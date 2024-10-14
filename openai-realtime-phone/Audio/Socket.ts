import { Capacitor } from "@capacitor/core"
import { SrtBaseStream } from "srt-base-stream"

export interface SocketAdapter {
	readCallback: CallableFunction;

	/**
	 * Open the socket connection
	 * returns a promise - success on successful connection
	 * @return <Promise>
	 */
	open (address?:string, port?:number): Promise<void>;

	// Events:
	onClose: CallableFunction
	onError: (error: any) => void
	onMessage:  ((data:Uint8Array) => any) | null
	onOpen: CallableFunction

	// methods:
	close(code?: number, reason?: string): void;
	send(data: Uint8Array): void;
}

declare let Socket: any

/**
 * 	Uses the SrtBaseStream for connectivity
 */
const SrtSocketAdapter = class implements SocketAdapter {
	streamId: string = ''
	// assign events empty initial functions
	// which can be called without error
	public onClose = () => {}
	public onError = (error:any) => {}
	public onMessage = (data:Uint8Array) => {}
	public onOpen = () => {}
	public readCallback = (payload: {data: string;} | null, err?: any) => { alert("You need to override me :-)")}
	public readonly address: string
	public readonly port: number
	constructor(address:string, port:number) {
		this.address = address
		this.port = port
	}
	open(): Promise<any> {
		if (this.streamId.length > 0) {
			this.close()
		}
		return new Promise((resolve, reject) => {
			SrtBaseStream.openAudioTransmissionStream({
				addr: this.address,
				port: this.port
			}, this.socketReadCallback)
				.then( result => {
					this.streamId = result.id
					resolve('socket connected')
				})
				.catch((error) => {
					console.log("Srt Stream Connection Failed: "+error )
					reject(error)
				})
			/*this.socket.onData = (data: Uint8Array) => {
				this.onMessage(data)
			}
			this.socket.onClose = (hasError: Boolean) => {
				if (hasError) console.error('Connection closed with error')
				this.onClose()
			}
			this.socket.onError = (message: string) => {
				this.onError(message)
			}*/
		})
	}
	/**
	 * Define this callback using arrow notation as otherwise
	 * loses connection to 'this' and can't make readCallback
	 */
	socketReadCallback = (payload: any, err?: any) => {
		try {
			// is it the id callback
			if (payload.id !== undefined) {
				this.streamId = payload.id;
				return
			}
			// no - so pass it on to provided callback
			this.readCallback(payload, err)
		} catch (e) {
			alert((e as Error).message)
		}
	}
	close() {
		SrtBaseStream.closeStream({ id: this.streamId.toString() } )
		this.streamId = ''
	}
	/* Transmits data using the WebSocket connection. data can be a string, a Blob, an ArrayBuffer, or an ArrayBufferView. */
	send(data:Uint8Array  ) {
		// todo: standardize transition format
		// convert string / Array like - blob Array buffer view into uint8
		SrtBaseStream.writeStream({ id: this.streamId, data: data.toString() })
			.then( result => {
				console.log(result)
			})
			.catch((error) => {
				console.log("SrtBaseStream writeStream failed with "+error)
			})
	}
}

/**
 * 	Uses Socket from cordova-plugin-socket-tcp for sending
 */
const TcpSocketAdapter = class implements SocketAdapter {
	socket: typeof Socket|null = null
	// assign events empty initial functions
	// which can be called without error
	public onClose = () => {}
	public onError = (error:any) => {}
	public onMessage = (data:Uint8Array) => {}
	public onOpen = () => {}
	public readonly address: string
	public readonly port: number
	public readCallback = (payload: {data: string;} | null, err?: any): void => {};
	constructor(address:string, port:number) {
		this.address = address
		this.port = port
	}
	open(): Promise<any> {
		if (this.socket !== null) this.socket.close()
		return new Promise((resolve, reject) => {
			this.socket = new Socket()
			this.socket.open(
				this.address,
				this.port,
				() => {
					resolve('socket connected')
				},
				(errorMessage:string) => {
					console.error('Unsuccessful opening', errorMessage)
					reject(errorMessage)
				}
			)
			this.socket.onData = (data: Uint8Array) => {
				this.onMessage(data)
			}
			this.socket.onClose = (hasError: Boolean) => {
				if (hasError) console.error('Connection closed with error')
				this.onClose()
			}
			this.socket.onError = (message: string) => {
				this.onError(message)
			}
		})
	}
	close() {
		this.socket?.close(()=>{}, (message: string) =>{ console.error(message) })
	}
	/* Transmits data using the WebSocket connection. data can be a string, a Blob, an ArrayBuffer, or an ArrayBufferView. */
	send(data: Uint8Array) {
		// todo: standardize transition format
		// convert string / Array like - blob Array buffer view into uint8
		this.socket?.write(data, ()=>{}, console.error)
	}
}

const WebSocketAdapter = class implements SocketAdapter {
	socket: WebSocket|null = null

	// assign events empty initial functions
	// which can be called without error
	public onClose = () => {}
	public onError = (err: any) => {}
	public onMessage = (data: Uint8Array) => {}
	public onOpen = () => {}
	public readCallback = (payload: {data: string;} | null, err?: any): void => {};

	public readonly address: string

	constructor(address:string) {
		this.address = address
	}

	open() : Promise<any> {
		// close any existing sockets just in case.
		if (this.socket !== null) this.socket.close()

		return new Promise((resolve, reject) => {
			this.socket = new WebSocket(`wss://${this.address}`)
			this.socket.onopen = () => {
				resolve('socket connected')
				this.onOpen()
			}
			this.socket.onerror = (err) => {
				console.error(err)
				reject(err)
				this.onError(err)
			}
			this.socket.onclose = () => {
				this.onClose()
			}
			this.socket.onmessage = async (event: MessageEvent) => {
				const data = await event.data.arrayBuffer()
				const uInt8Data = new Uint8Array(data)
				this.onMessage(uInt8Data)
			}
		})
	}

	close() {
		this.socket?.close()
	}

	/** Transmits data using the WebSocket connection. data can be a string, a Blob, an ArrayBuffer, or an ArrayBufferView. */
	send(data: Uint8Array) {
		// todo: standardize transition format
		this.socket?.send(data)
	}
}

export class SocketFactory {
	/**
	 * @returns SocketAdapter
	 */
	public get(address: string, port: number): SocketAdapter {
		let adaptee: SocketAdapter
		if (Capacitor.getPlatform() == 'web') {
			// specific connection settings should be configurable.
			adaptee = new WebSocketAdapter('ws.srt.newicon.dev')
		} else {
			adaptee = new SrtSocketAdapter(address, port)
		}
		return adaptee
	}
}