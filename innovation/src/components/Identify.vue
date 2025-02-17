<script setup>
import { useUserStore } from '../stores/user'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'radix-vue'
import { Icon } from '@iconify/vue'
import { ref, reactive } from 'vue'

const emit = defineEmits(['loginSuccess'])

const userStore = useUserStore()


const loginType = ref('register')

const form = reactive({
	status: '',
	errors: {},
	email: '',
	password: '',
	name: ''
})

const passwordFieldType = ref('password')

const togglePassword = () => {
	passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password'
}

const register = async () => {
	const result = await userStore.register(form.name, form.email, form.password);
	if (result.status == 'fail') {
		form.status = 'fail';
		form.errors = result.data;
		return;
	}
	if (result.status == 'success') {
		form.status = 'success';
		await userStore.login(form.email, form.password);
		emit('loginSuccess')
	}
}

const handleInteractOutside = (event) => {
	// Prevent dialog from closing when clicking the overlay
	event.preventDefault();
};

const login = async () => {
	await userStore.login(form.email, form.password);
	if (userStore.isLoggedIn) {
		userStore.showLoginDialog = false;
	}
}


</script>
<template>
	<DialogRoot :disableOutsidePointerEvents="true"  v-model:open="userStore.showLoginDialog" modal>
		<DialogPortal>
			<Transition enter-active-class="ease-in-out duration-200 delay-50" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="ease-in-out duration-300" leave-from-class="opacity-100" leave-to-class="opacity-0">
				<DialogOverlay class="bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlayShow  fixed inset-0 z-30" />
			</Transition>
			<Transition enter-active-class="ease-in-out duration-300 transform-all" enter-from-class="opacity-0 scale-90" enter-to-class="opacity-100 scale-100" leave-active-class="ease-in-out duration-300" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 scale-90">
				<DialogContent :interactOutside="handleInteractOutside" @escapeKeyDown="handleInteractOutside" :trapFocus="true" @pointerDownOutside="handleInteractOutside" class="data-[state=open]:animate-contentShow text-white fixed top-[50%] left-[50%] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[450px]  rounded-xl bg-black/30 backdrop-blur-sm p-[25px]  focus:outline-none z-[100] border border-white/20">
					<DialogTitle class="m-0 text-[17px] font-semibold">
						Who are you?
					</DialogTitle>
					<DialogDescription class="mt-[10px] mb-5 text-[15px] leading-normal"></DialogDescription>
					<form @submit.prevent="handleSubmit">
						<fieldset class="mb-[15px]">
							<div>
								<input v-if="loginType == 'register'" v-model="form.name" id="name" name="name" type="text" autocomplete="name" required aria-label="Name" class="block w-full rounded-md bg-white/10 px-3 py-3 text-base text-white  outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-white sm:text-md mb-4" placeholder="Your Name">
							</div>
							<div class="">
								<input v-model="form.email" id="email-address" name="email" type="email" autocomplete="email" required aria-label="Email address" class="block w-full rounded-t-md px-3 py-3 text-base text-white  outline-1 -outline-offset-1  placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2  sm:text-md" :class="{
									'bg-white/10 outline-gray-300 focus:outline-white': form.errors.email == undefined,
									'bg-red-500/10 outline-red-500 focus:outline-red-500': form.errors.email
								}" placeholder="Email address">
							</div>
							<div class="-mt-px relative">
								<input ref="passwordInput" v-model="form.password" id="password" name="password" :type="passwordFieldType" autocomplete="current-password" required aria-label="Password" class="block peer w-full rounded-b-md bg-white/10 px-3 py-3 text-base text-white outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-white sm:text-md" placeholder="Password">
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
							<div v-if="form.status == 'fail'" class="text-red-500">{{ form.errors.email }}</div>
						</fieldset>
						<div class="mt-[25px] flex justify-between items-center">
							<a v-if="loginType == 'register'" href="#" @click="loginType = 'login'">Login</a>
							<a v-if="loginType == 'login'" href="#" @click="loginType = 'register'">Register</a>
							<button v-if="loginType == 'register'" @click="register" class="cursor-pointer inset-shadow-sm border border-transparent hover:border-white/10 active:inset-shadow-black/50 hover:bg-white/20 bg-white/10  shadow-2xl drop-shadow-2xl rounded-full hover:bg-pink  inline-flex py-4 items-center justify-center px-8 font-semibold">
								Register
								<Icon icon="lucide:chevron-right" />
							</button>
							<button v-if="loginType == 'login'" @click="login" class="cursor-pointer inset-shadow-sm border border-transparent hover:border-white/10 active:inset-shadow-black/50  hover:bg-white/20 bg-white/10  shadow-2xl drop-shadow-2xl rounded-full hover:bg-pink  inline-flex py-4 items-center justify-center px-8 font-semibold">
								Login
							</button>
						</div>
					</form>
					<!-- <DialogClose
					class="cursor-pointer hover:border  absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:outline-none"
					aria-label="Close">
						<Icon icon="lucide:x" />
					</DialogClose> -->
				</DialogContent>
			</Transition>
		</DialogPortal>
	</DialogRoot>
</template>