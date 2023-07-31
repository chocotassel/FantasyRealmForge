import MapMaker from '../lib';
import { useEffect } from 'react';

function Layout() {

	useEffect(() => {
		if (document.getElementById('map')?.innerHTML) return;
		const map = new MapMaker.Map({ 
			container: 'map',
			width: 1024,
			height: 512,
		});

		map.addSource('china', {type:'type', url:'src/assets/data/world-geojson.json'}, () => {
				console.log('source added');
			}
		)
	}, [])

    return (
		<>
			<div id='map'></div>
		</>
    )
}

export default Layout