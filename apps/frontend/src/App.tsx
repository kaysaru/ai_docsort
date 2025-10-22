
import {Outlet} from "@tanstack/react-router";

function App() {
    return (
        <div className='flex flex-col max-w-4xl w-full'>
            <div className='flex flex-row h-full'>
                <div className='flex flex-col w-full'>
                    <Outlet/>
                </div>
            </div>
        </div>
    )
}

export default App
