<script setup>
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'

const openReadmeInEditor = () => fetch('/__open-in-editor?file=README.md')
</script>

<template>
	<body class="h-full relative dark:bg-black">

		<div class="flex flex-col min-h-screen items-center justify-center relative">
	
			<img class="absolute top-0 left-0 w-full h-full object-cover bg-black" src="https://newicon.net/firefly/file/get?id=UaAIgHx3SVzj01COXY6Bs9&amp;q=90&amp;f=webp" alt="Innovate" sizes="100vw" loading="lazy" srcset="https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=400 400w,
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=800 800w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=1000 1000w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=1400 1400w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=2000 2000w, 
			 https://newicon.net/firefly/file/img?id=UaAIgHx3SVzj01COXY6Bs9&amp;f=webp&amp;q=90&amp;w=2600 2600w">
	
	
	
			<div class="relative z-10 max-w-[732px] text-center p-4">
				<h1 class="text-white text-[70px] leading-[80px] font-medium mb-12">From design <span class="font-semibold">thinking</span> <br> to design <span class="font-semibold">doing</span></h1>
				<p class="text-white font-normal mt-[28px] font-outfit text-[30px] leading-[38px] text-center tracking-[-0.02em]">Power innovation&nbsp;for yourself, for your teams and for your clients with a digital tool taking  you step-by-step through the process in less than a day!</p>
				<button class="rounded-sm shadow-2xl drop-shadow-2xl text-black inline-flex items-center justify-center px-5 py-2.5 font-semibold text-center no-underline appearance-none;
				bg-white inset-shadow-sm bg-linear-65 hover:from-purple-500 hover:to-pink-500 ring-black/50 cursor-pointer active:inset-shadow-black/50 active:ring-4 mt-24 btn-xl font-medium text-[24px] py-5 px-7">Begin Innovation Session!</button>
			</div>
	
		</div>
	
	</body>
</template>
