import { useEffect } from 'react';
import Routers from './pages/Routers';
import { useAuthStore } from './store/auth.store';

function App() {
    const { hydrate  } = useAuthStore();

    useEffect(() => {
        hydrate();
    }, []);

    return (
        <>
            <Routers />
        </>
    );
}

export default App;
