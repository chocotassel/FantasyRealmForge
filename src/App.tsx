import Layout from './components/Layout'
import { WebGPUContextProvider } from './components/WebGPUContext';

function App() {

    return (
		<>
			<WebGPUContextProvider>
				<Layout />
			</WebGPUContextProvider>
		</>
    )
}

export default App
