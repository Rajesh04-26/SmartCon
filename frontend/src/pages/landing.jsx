import React from 'react';
import "../App.css";
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { FiShield, FiZap, FiCpu, FiGlobe } from 'react-icons/fi'; // Install react-icons if you haven't

export default function LandingPage() {
    const router = useNavigate();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const featureList = [
        { icon: <FiZap />, title: "Lightning Fast", desc: "Experience sub-100ms latency globally with our edge network." },
        { icon: <FiShield />, title: "Secure by Design", desc: "Enterprise-grade E2EE for every communication and file shared." },
        { icon: <FiCpu />, title: "AI Integration", desc: "Smart summaries and action items generated automatically." },
        { icon: <FiGlobe />, title: "Global Sync", desc: "Work across timezones with real-time collaborative state." }
    ];

    return (
        <div className='landingPageContainer'>
            {/* Scroll Progress Bar */}
            <motion.div className="progress-bar" style={{ scaleX }} />

            {/* 1. Header / Navbar */}
            <motion.nav 
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6 }}
                className="navBar"
            >
                <div className='navHeader'>
                    <h2>SMARTCON</h2>
                </div>
                <div className='navlist'>
                    <div onClick={() => router("/aljk23")}>Join as Guest</div>
                    <div onClick={() => router("/auth")}>Register</div>
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className='login-btn-premium' 
                        onClick={() => router("/auth")} 
                        role='button'
                    >
                        Login
                    </motion.div>
                </div>
            </motion.nav>

            {/* 2. Hero Section */}
            <div className="landingMainContainer">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="heroText"
                >
                    <motion.div variants={itemVariants} className="premium-tag">
                        ✨ VERSION 2.0 IS NOW LIVE
                    </motion.div>
                    
                    <motion.h1 variants={itemVariants}>
                        Communicate.<br />
                        <span className="gradient-text-alt">Collaborate.</span> 
                    </motion.h1>

                    <motion.p variants={itemVariants} className="hero-subtitle">
                        Connect with clarity, communicate with ease. The ultimate 
                        workspace for high-velocity teams.
                    </motion.p>

                    <motion.div variants={itemVariants} className='cta-wrapper'>
                        <div role='button' className="main-cta" onClick={() => router("/auth")}>
                            Get Started Free
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="landingImage slideFromLeft"
                >
                    <div className="image-rel-container">
                        <img src="/mobile.png" alt="SMARTCON Preview" />
                    </div>
                </motion.div>
            </div>

            {/* 3. Logo Cloud */}
            <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="logo-cloud"
            >
                <p>POWERING MODERN TEAMS AT</p>
                <div className="logo-row">
                    <span>Vercel</span><span>Stripe</span><span>Linear</span><span>GitHub</span><span>Airbnb</span>
                </div>
            </motion.div>

            {/* NEW: 4. Features Section */}
            <section className="features-section">
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="section-header"
                >
                    <h2>Everything you need to <span className="gradient-text-alt">scale faster</span></h2>
                    <p>Focus on building, we handle the connectivity.</p>
                </motion.div>

                <div className="features-grid">
                    {featureList.map((f, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="feature-card"
                        >
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* NEW: 5. Stats / Proof Section */}
            <section className="stats-section">
                <div className="stats-container">
                    <div className="stat-item">
                        <h4>99.9%</h4>
                        <p>Uptime SLA</p>
                    </div>
                    <div className="stat-item">
                        <h4>10M+</h4>
                        <p>Messages Daily</p>
                    </div>
                    <div className="stat-item">
                        <h4>256-bit</h4>
                        <p>Encryption</p>
                    </div>
                </div>
            </section>

            {/* NEW: 6. Final CTA Footer */}
            <section className="final-cta">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    className="cta-glass-card"
                >
                    <h2>Ready to transform your workflow?</h2>
                    <p>Join 10,000+ teams already using SMARTCON.</p>
                    <button className="main-cta" onClick={() => router("/auth")}>Get Started Now</button>
                </motion.div>
                
                <footer className="simple-footer">
                    <p>© 2024 SMARTCON. All rights reserved.</p>
                </footer>
            </section>
        </div>
    )
}