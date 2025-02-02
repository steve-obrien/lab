<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
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
const nextModal = ref(false)
// api to create a workshop
const createWorkshop = () => {


	workshopStore.name = 'Innovation Session';

	// lets label this person as a facilitator - we are going to assume
	// that you trust everyone you are inviting to the unique link generated.
	// as anyone who joins - and is a massive nerd - could hack the client state 
	// and upgrade themselves to a facilitator.

	// log the user in as a facilitator
	userStore.login();
	workshopStore.createWorkshop(userStore.id)

	router.push({ path: '/' + workshopStore.roomId })
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
				<h1 class="text-white text-[70px] leading-[80px] font-medium mb-12"> 	{{showModal}} -From design <span class="font-semibold">thinking</span> <br> to design <span class="font-semibold">doing</span></h1>
				<p class="text-white font-normal mt-[28px] font-outfit text-[30px] leading-[38px] text-center tracking-[-0.02em]">Power innovation&nbsp;for yourself, for your teams and for your clients with a digital tool taking you step-by-step through the process in less than a day!</p>
				<button @click="createWorkshop()" class="rounded-sm shadow-2xl drop-shadow-2xl text-black inline-flex items-center justify-center px-5 py-2.5 font-semibold text-center no-underline appearance-none;
				bg-white inset-shadow-sm bg-linear-65 hover:from-purple-500 hover:to-pink-500 ring-black/50 cursor-pointer active:inset-shadow-black/50 active:ring-4 mt-24 btn-xl font-medium text-[24px] py-5 px-7">Begin Innovation Session!</button>
			</div>

		

		</div>


		<DialogRoot v-model:open="showModal">
			<DialogPortal>
				<Transition name="fade" >
					<DialogOverlay class="bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
				</Transition>

				<DialogContent
				class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
					<DialogTitle class="text-mauve12 m-0 text-[17px] font-semibold">
						Sesson details {{workshopStore.room}}
					</DialogTitle>
					<DialogDescription class="text-mauve11 mt-[10px] mb-5 text-[15px] leading-normal">
					</DialogDescription>
					<fieldset class="mb-[15px] flex items-center gap-5">
						<label
						class="w-[90px] text-right "
						for="name"> Name </label>
						<input
						placeholder="Session Name"
						id="name"
						v-model="workshopStorename"
						class="shadow-black focus:shadow-black inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
						defaultValue="">
					</fieldset>
					<fieldset class="mb-[15px] flex items-center gap-5">
						<label
						class="text-grass11 w-[90px] text-right text-[15px]"
						for="username"> Username </label>
						<input
						id="username"
						class="text-grass11 shadow-green7 focus:shadow-green8 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
						defaultValue="">
					</fieldset>
					<div class="mt-[25px] flex justify-end">
						<DialogClose as-child>
							<button @click="createWorkshop()"
							class="bg-green4 text-green11 hover:bg-green5 focus:shadow-green7 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
								Begin <Icon icon="lucide:chevron-right" />
							</button>
						</DialogClose>
					</div>
					<DialogClose
					class="text-grass11 hover:bg-green4 focus:shadow-green7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
					aria-label="Close">
						<Icon icon="lucide:x" />
					</DialogClose>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>


		<DialogRoot v-model:open="nextModal">
			<DialogPortal>
				<DialogOverlay class="bg-black 	data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
				<DialogContent
				class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
					<DialogTitle class="text-mauve12 m-0 text-[17px] font-semibold">
						Edit OTHER
					</DialogTitle>
					<DialogDescription class="text-mauve11 mt-[10px] mb-5 text-[15px] leading-normal">
						Make changes to your profile here. Click save when you're done.
					</DialogDescription>
					<fieldset class="mb-[15px] flex items-center gap-5">
						<label
						class="text-grass11 w-[90px] text-right text-[15px]"
						for="name"> Name </label>
						<input
						id="name"
						class="text-grass11 shadow-green7 focus:shadow-green8 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
						defaultValue="Pedro Duarte">
					</fieldset>
					<fieldset class="mb-[15px] flex items-center gap-5">
						<label
						class="text-grass11 w-[90px] text-right text-[15px]"
						for="username"> Username </label>
						<input
						id="username"
						class="text-grass11 shadow-green7 focus:shadow-green8 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
						defaultValue="@peduarte">
					</fieldset>
					<div class="mt-[25px] flex justify-end">
						<DialogClose as-child>
							<button
							class="bg-green4 text-green11 hover:bg-green5 focus:shadow-green7 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
								Save changes
							</button>
						</DialogClose>
					</div>
					<DialogClose
					class="text-grass11 hover:bg-green4 focus:shadow-green7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
					aria-label="Close">
						<Icon icon="lucide:x" />
					</DialogClose>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>

	</main>
</template>
