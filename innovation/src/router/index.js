import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
		},
		{
			path: '/facilitator/:room',
			name: 'facilitator',
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import('../views/FacilitatorView.vue'),
			props: true, // Pass route params as props
		},
		{
			path: '/workshop/:room',
			name: 'workshop',
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import('../views/WorkshopView.vue'),
			props: true, // Pass route params as props
		},
	],
})

export default router
