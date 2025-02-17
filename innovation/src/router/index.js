import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
	history: import.meta.env.SSR ? createMemoryHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
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
			// match a path like /abc-xyz-123
			path: '/:workshopId([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}|[a-z0-9]{10})',
			name: 'workshop',
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import('../views/WorkshopView.vue'),
			props: true, // Pass route params as props
		},
		{
			path: '/test',
			name: 'test',
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import('../views/TestView.vue'),
			props: true, // Pass route params as props
		},
	],
})

export default router
