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
			// map.addSource('map', 'src/assets/data/world-geojson.json', {}, () => {
			// 		console.log('source added');
			// 	}
			// )
			map.addSource('test', 'src/assets/data/geography-data.json', () => {
					console.log('test added');
				}
			)
		}).catch((err) => {
			console.error(err);
		})
	}


    return (
		<>
			<div id='map'></div>
		</>
    )
}

export default Layout