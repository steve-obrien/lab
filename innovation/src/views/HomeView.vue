<script setup>
import { useRouter } from 'vue-router'
import { onMounted, reactive, ref } from 'vue'
const router = useRouter()
import { useWorkshopStore } from '../stores/workshop'
import { useUserStore } from '../stores/user'

import Identify from '../components/Identify.vue'

const workshopStore = useWorkshopStore()
const userStore = useUserStore()

const showModal = ref(false)

onMounted(async () => {
	await userStore.authRefresh()
})

const loginType = ref('register')

const registerResultFail = reactive({
	data: {},
	status: ''
})

const register = async () => {
	registerResultFail.data = {};
	registerResultFail.status = '';
	const result = await userStore.register();
	if (result.status == 'fail') {
		registerResultFail.data = result.data;
		registerResultFail.status = result.status;
		return;
	}
	if (result.status == 'success') {
		await userStore.login();
	}
}

const login = async () => {
	await userStore.login();
	if (userStore.isLoggedIn) {
		showModal.value = false;
	}
}

// api to create a workshop
const createWorkshop = async () => {

	// if not logged in then show the login/register modal
	if (userStore.isNotLoggedIn) {
		userStore.showLogin()
		return;
	}

	// you must be logged in so create a workshop
	workshopStore.name = 'Innovation Session';

	// lets label this person as a facilitator - we are going to assume
	// that you trust everyone you are inviting to the unique link generated.
	// as anyone who joins - and is a massive nerd - could hack the client state 
	// and upgrade themselves to a facilitator.

	// log the user in as a facilitator
	// create a user and a user id - so we can manage state

	const roomId = await workshopStore.createWorkshop(userStore.id)

	// redirect to the room
	router.push({ path: '/' + roomId })

	// router.push({ path: '/' + roomId })
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
				<h1 class="text-white text-[70px] leading-[80px] font-medium mb-12">From design <span class="font-semibold">thinking</span> <br> to design <span class="font-semibold">doing</span></h1>
				<p class="text-white font-normal mt-[28px] font-outfit text-[30px] leading-[38px] text-center tracking-[-0.02em]">Power innovation&nbsp;for yourself, for your teams and for your clients with a digital tool taking you step-by-step through the process in less than a day!</p>
				<button @click="createWorkshop()" class="rounded-sm shadow-2xl drop-shadow-2xl text-black inline-flex items-center justify-center text-center no-underline appearance-none;
				bg-white inset-shadow-sm bg-linear-65 hover:from-purple-500 hover:to-pink-500 ring-black/50 cursor-pointer active:inset-shadow-black/50 active:ring-4 mt-24 btn-xl font-medium text-[24px] py-5 px-7">Begin Innovation Session!</button>

				<div class="text-white">
					{{ userStore }}
					<button v-if="userStore.accessToken" @click="userStore.logout()">LOGOUT</button>
				</div>
			</div>
		</div>

	</main>
	
</template>