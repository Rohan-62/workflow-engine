import { Link, useLocation } from 'react-router-dom';

function Navbar() {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-text">LogicFlow</span>
                </Link>
                <div className="navbar-links">
                    <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
                        <span className="nav-icon">📊</span> Dashboard
                    </Link>
                    <Link to="/workflows" className={`nav-link ${isActive('/workflows') ? 'active' : ''}`}>
                        <span className="nav-icon">🔄</span> Workflows
                    </Link>
                    <Link to="/audit" className={`nav-link ${isActive('/audit') ? 'active' : ''}`}>
                        <span className="nav-icon">📋</span> Audit Log
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
