
import {Link, Outlet} from "@tanstack/react-router";
import {Button} from "@/components/ui/button.tsx";

function App() {
    return (
        <div className='flex flex-col max-w-4xl w-full'>
            <div className='flex flex-row h-full'>
                <div className='flex flex-col w-full'>

                    <div className='sticky top-0 w-full bg-background border-b py-3 px-1 mb-3'>
                        <Link to='/'>
                            <Button variant='ghost'>Home</Button>
                        </Link>
                        <Link to='/load'>
                            <Button variant='ghost'>Load</Button>
                        </Link>
                        <Link to='/processing'>
                            <Button variant='ghost'>Processing</Button>
                        </Link>
                    </div>
                    <Outlet/>
                </div>
            </div>
        </div>
    )
}

export default App
