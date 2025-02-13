<script setup>
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
const router = useRouter()
import { useWorkshopStore } from '../stores/workshop'
import { useUserStore } from '../stores/user'
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
	DialogTitle,
} from 'radix-vue'
import { Icon } from '@iconify/vue'



const workshopStore = useWorkshopStore()
const userStore = useUserStore()

const showModal = ref(false)

onMounted(async () => {
	await userStore.authRefresh()
})

const loginType = ref('register')
// api to create a workshop
const createWorkshop = async () => {


	showModal.value = true

	workshopStore.name = 'Innovation Session';

	if (userStore.email && userStore.password && userStore.name) {

		// lets label this person as a facilitator - we are going to assume
		// that you trust everyone you are inviting to the unique link generated.
		// as anyone who joins - and is a massive nerd - could hack the client state 
		// and upgrade themselves to a facilitator.

		// log the user in as a facilitator
		// create a user and a user id - so we can manage state
		const result = await userStore.register();
		console.log(result)

		// if successful login.
		await userStore.login();

		const roomId = await workshopStore.createWorkshop(userStore.id)
	}

	// router.push({ path: '/' + roomId })
}

const login = async () => {
	await userStore.login();
}

const passwordFieldType = ref('password')
const togglePassword = () => {
	passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password'
}

</script>

<template>

	<main class="h-full relative dark:bg-black">

		<div class="flex flex-col min-h-screen items-center justify-center relative">

			<img class="absolute top-0 left-0 w-full h-full object-cover bg-black" src="https://newicon.net/firefly/file/get?id=UaAIgHx3SVzj01COXY6Bs9&amp;q=90&amp;f=webp" alt="Innovate" sizes="100vw" loading="lazy" srcset="https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=400 400w,
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=800 800w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=1000 1000w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=1400 1400w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=2000 2000w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=2600 2600w">


			<div class="relative z-10 max-w-[732px] text-center p-4">
				<h1 class="text-white text-[70px] leading-[80px] font-medium mb-12"> {{ showModal }} -From design <span class="font-semibold">thinking</span> <br> to design <span class="font-semibold">doing</span></h1>
				<p class="text-white font-normal mt-[28px] font-outfit text-[30px] leading-[38px] text-center tracking-[-0.02em]">Power innovation&nbsp;for yourself, for your teams and for your clients with a digital tool taking you step-by-step through the process in less than a day!</p>
				<button @click="createWorkshop()" class="rounded-sm shadow-2xl drop-shadow-2xl text-black inline-flex items-center justify-center px-5 py-2.5 font-semibold text-center no-underline appearance-none;
				bg-white inset-shadow-sm bg-linear-65 hover:from-purple-500 hover:to-pink-500 ring-black/50 cursor-pointer active:inset-shadow-black/50 active:ring-4 mt-24 btn-xl font-medium text-[24px] py-5 px-7">Begin Innovation Session!</button>

				<button class="bg-white text-black px-4 py-2 rounded-md" @click="showModal = true">MODAL</button>

				<div class="text-white">
					{{ userStore }}

					<button v-if="userStore.accessToken" @click="userStore.logout()">LOGOUT</button>
				</div>
			</div>

		</div>

		<DialogRoot v-model:open="showModal">
			<DialogPortal>
				<Transition name="fade">
					<DialogOverlay class="bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlayShow  fixed inset-0 z-30" />
				</Transition>
				<DialogContent class="data-[state=open]:animate-contentShow text-white fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-black/30 backdrop-blur-sm p-[25px]  focus:outline-none z-[100]">
					<DialogTitle class="m-0 text-[17px] font-semibold">
						Sesson details {{ workshopStore.room }}
					</DialogTitle>
					<DialogDescription class="mt-[10px] mb-5 text-[15px] leading-normal"></DialogDescription>
					<fieldset class="mb-[15px]">
						<div>
							<input v-if="loginType == 'register'" v-model="userStore.name" id="name" name="name" type="text" autocomplete="name" required aria-label="Name" class="block w-full rounded-md bg-white/10 px-3 py-3 text-base text-white  outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-white sm:text-md mb-4" placeholder="Your Name">
						</div>
						<div class="">
							<input v-model="userStore.email" id="email-address" name="email" type="email" autocomplete="email" required aria-label="Email address" class="block w-full rounded-t-md bg-white/10 px-3 py-3 text-base text-white  outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-white sm:text-md" placeholder="Email address">
						</div>
						<div class="-mt-px relative">
							<input ref="passwordInput" v-model="userStore.password" id="password" name="password" :type="passwordFieldType" autocomplete="current-password" required aria-label="Password" class="block peer w-full rounded-b-md bg-white/10 px-3 py-3 text-base text-white outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-white sm:text-md" placeholder="Password">
							<div class="absolute right-2 top-3 size-6 peer-focus:opacity-100 opacity-50">
								<svg @click="togglePassword" v-if="passwordFieldType == 'password'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
								</svg>
								<svg @click="togglePassword" v-if="passwordFieldType == 'text'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
								</svg>
							</div>
						</div>
					</fieldset>
					<div class="mt-[25px] flex justify-center">
						<a v-if="loginType == 'register'" href="#" @click="loginType = 'login'">Login</a>
						<a v-if="loginType == 'login'" href="#" @click="loginType = 'register'">Register</a>
						<button v-if="loginType == 'register'" @click="createWorkshop" class="cursor-pointer hover:bg-white/20 bg-white/10  shadow-2xl drop-shadow-2xl rounded-full hover:bg-pink  inline-flex py-4 items-center justify-center px-8 font-semibold">
							Register
							<Icon icon="lucide:chevron-right" />
						</button>
						<button v-if="loginType == 'login'" @click="login" class="cursor-pointer hover:bg-white/20 bg-white/10  shadow-2xl drop-shadow-2xl rounded-full hover:bg-pink  inline-flex py-4 items-center justify-center px-8 font-semibold">
							Login
						</button>
					</div>
					<DialogClose
					class="text-grass11  focus:shadow-green7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:outline-none"
					aria-label="Close">
						<Icon icon="lucide:x" />
					</DialogClose>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>




	</main>
</template>
