import { mount } from 'svelte'
import App from '$client/app/App.svelte'
import { init } from '$lib/Router'

init()

mount(App, { target: document.getElementById('app')! })
