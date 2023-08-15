import MapMaker from '../lib/Terraria';
import { useEffect } from 'react';

function Layout() {

	useEffect(() => {
		initMap();
	}, [])

	const initMap = async () => {
		if (document.getElementById('map')?.innerHTML) return;
		const map = new MapMaker.Map({ 
			container: 'map',
			width: 512,
			height: 512,
		});

		map.initGPU().then(() => {
			map.addSource('map', 'src/assets/data/world-geojson.json', {}).then(() => {
				console.log('map added');
			}).catch((err) => {
				console.error(err);
			})
			map.addSource('map', 'src/assets/data/world-geojson.json', {type: 'polygon2line'}).then(() => {
				console.log('map added');
			}).catch((err) => {
				console.error(err);
			})
			// map.addSource('test', 'src/assets/data/geography-data.json', () => {
			// 		console.log('test added');
			// 	}
			// )
			document.getElementById('btn')?.addEventListener('click', map.transform.bind(map))
		}).catch((err) => {
			console.error(err);
		})
	}


    return (
		<>
			<div id='map'></div>
			<button id='btn'>转换</button>
		</>
    )
}

export default Layout