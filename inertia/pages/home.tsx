import { Head } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import {
  CheckCircle,
  ArrowRight,
  Sun,
  Moon,
  Brain,
  Target,
  Zap,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// Components
const Navigation = ({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) => (
  <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
    <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
      {/* Logo */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BC</span>
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">BluePilot</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Boutons droite */}
      <div className="flex items-center space-x-4">
        <a
          href="/pricing"
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
        >
          Pricing
        </a>
        <a
          href="/dashboard"
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          Sign Up
        </a>
        
        {/* Toggle Theme Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  </nav>
)

const HeroSection = () => (
  <section className="relative flex flex-col justify-center items-center text-center px-4 pt-16 pb-20 overflow-hidden w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
    {/* Fond animé similaire au Svelte */}
    <div className="absolute inset-0 w-full opacity-10 dark:opacity-20">
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-32 right-10 w-72 h-72 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
        style={{ animationDelay: '2s' }}
      ></div>
    </div>

    <div className="max-w-4xl mb-8 relative z-10">
      <div className="mb-6 flex justify-center items-center gap-2">
        <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          🎉 Completely Free Forever - No Credit Card Required
        </div>
      </div>
      <h1 className="text-4xl md:text-7xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
        <span className="text-blue-500">Grow</span> and <span className="text-blue-500">Monetize</span> your Bluesky audience—faster, smarter, automatically
      </h1>
      <p className="text-lg md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
        Follower tracking, post scheduling, and AI-driven audience analysis—all in one place.
      </p>

      <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
        <Button variant="cta" size="cta" onClick={() => (window.location.href = '/dashboard')}>
          Get Started Free
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          100% Free - All features included - No hidden costs
        </p>
      </div>
    </div>
  </section>
)

const ProblemSolutionSection = () => (
  <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Unlock Your Bluesky Potential
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Stop wasting time and money on a dead audience.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-8 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm">
          <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
            The Problem
          </div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Your Audience is Silent
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your posts get ignored, your follower count stagnates, and worst of all, you're losing
            money.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Whether you're a brand or a creator, an inactive audience means wasted effort and missed
            opportunities.
          </p>
        </div>
        <div className="p-8 bg-white dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="text-blue-500 dark:text-blue-400 text-sm mb-2 font-semibold">
            Our Solution
          </div>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            AI-Driven Engagement
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Automate interactions, target the right people, and turn your followers into active
            supporters.
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            More engagement, more visibility, more revenue—without the manual grind.
          </p>
        </div>
      </div>
    </div>
  </section>
)



// Section Followback Analysis
const FollowbackSection = () => (
  <section className="py-20 px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-20 right-20 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Image */}
        <div className="order-2 lg:order-1">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500">
            <img
              src="/images/followback.png"
              alt="Followback Analysis Dashboard"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="order-1 lg:order-2 space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">🎯</span>
            Relationship Management
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Discover who doesn't{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              follow you back
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Stop wasting time on one-sided relationships. Our analysis tool instantly reveals who doesn't follow you back, allowing you to optimize your following strategy.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Automatic Detection</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Instantly identify accounts that don't follow you back with real-time analysis
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Bulk Actions</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Perform mass unfollowing operations with smart filtering and safety controls
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Detailed Statistics</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Get comprehensive insights on your mutual relationships and engagement patterns
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => (window.location.href = '/dashboard')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Analyze my relationships
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// Section Analytics Globale
const AnalyticsSection = () => (
  <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-16 right-32 w-56 h-56 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <div className="space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">📊</span>
            Advanced Analytics
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Complete analytics{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              dashboard
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Get a comprehensive overview of your Bluesky performance. Track your growth, analyze your best posts, and understand your audience like never before.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete History</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Track your followers and following evolution with detailed historical data
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Performance Analysis</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover which posts perform best and understand what resonates with your audience
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Engagement Metrics</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Get detailed insights on likes, reposts, replies and engagement trends over time
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => (window.location.href = '/dashboard')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              View my analytics
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500">
          <img
            src="/images/analytics.png"
            alt="Analytics Dashboard Global"
            className="w-full h-auto object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>
      </div>
    </div>
  </section>
)

// Section Relationship Tracker Evolution
const RelationshipTrackerSection = () => (
  <section className="py-20 px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-40 right-24 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-32 left-16 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Image */}
        <div className="order-2 lg:order-1">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transform hover:scale-105 transition-transform duration-500">
            <img
              src="/images/relationshiptracker.png"
              alt="Relationship Evolution Tracker"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="order-1 lg:order-2 space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">📈</span>
            Relationship Tracking
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Track the evolution of{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              your relationships
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Visualize in real-time the evolution of your follower/following relationships. Identify trends, detect changes, and optimize your growth strategy.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Timeline Charts</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Visualize your relationship evolution with beautiful, interactive timeline charts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time Detection</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Get instant notifications when someone unfollows you or changes their relationship status
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Complete History</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Access comprehensive records of all your social interactions and relationship changes
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              variant="cta"
              size="cta"
              onClick={() => (window.location.href = '/dashboard')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Track my relationships
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// Section DM Campaign - Prospection automatisée
const DMCampaignSection = () => (
  <section className="py-24 px-4 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-10 dark:opacity-20">
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
    
    <div className="max-w-6xl mx-auto text-center relative z-10">
      <div className="space-y-12">
        {/* Badge */}
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-8 py-4 rounded-full text-base font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-lg">
          <span className="mr-3 text-xl">💼</span>
          Automated Prospecting
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900 dark:text-white">
          Turn your audience into{' '}
          <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
            paying customers
          </span>
        </h2>

        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
          Analyze your audience with AI and automatically send personalized messages that convert. 
          Drive traffic, generate leads, and increase revenue with smart automation.
        </p>

        {/* Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 max-w-5xl mx-auto transform hover:scale-105 transition-transform duration-500">
          <img
            src="/images/dmCampaign.png"
            alt="DM Campaign Dashboard"
            className="w-full h-auto object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-10 mt-16">
          <div className="text-center space-y-6 p-8 bg-white/60 dark:bg-gray-800/30 rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Target className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Prospecting</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              AI identifies your ideal customers and automatically reaches out with personalized messages that convert
            </p>
          </div>
          <div className="text-center space-y-6 p-8 bg-white/60 dark:bg-gray-800/30 rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Zap className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Drive Traffic</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Direct qualified prospects to your website, products, or services with targeted messaging campaigns
            </p>
          </div>
          <div className="text-center space-y-6 p-8 bg-white/60 dark:bg-gray-800/30 rounded-2xl border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Brain className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Revenue</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Convert conversations into sales with automated follow-ups and personalized offers that close deals
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-12">
          <Button
            variant="cta"
            size="cta"
            onClick={() => (window.location.href = '/dashboard')}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 px-12 py-5 text-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
          >
            Start Converting Your Audience
            <ArrowRight className="w-7 h-7" />
          </Button>
          <p className="text-gray-500 dark:text-gray-400 text-lg mt-6">
            100% Free - Start generating leads in minutes
          </p>
        </div>
      </div>
    </div>
  </section>
)



const VideoSection = () => (
  <section className="py-24 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-32 left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-20 right-24 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Video Container */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 transform hover:scale-105 transition-transform duration-500">
          <video
            className="w-full aspect-video object-cover"
            src="/videos/landing_video.mp4"
            autoPlay
            muted
            loop
            playsInline
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
        </div>

        {/* Text Content */}
        <div className="space-y-8">
          <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="mr-2">🎬</span>
            Product Demo
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
            Transform Your Bluesky Strategy{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              in 90 Seconds
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            See how our AI-powered platform helps you automate engagement and grow your audience
            effortlessly. This quick demo shows:
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Audience Analysis</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Advanced keyword-based bio embeddings for precise audience segmentation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Effortless Automation</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Follower tracking and post scheduling that works while you sleep
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button 
              variant="cta" 
              size="cta" 
              onClick={() => (window.location.href = '/dashboard')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-gray-500 dark:text-gray-400 text-lg mt-4">
              100% Free Forever - All features included
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const TestimonialCard = ({
  avatar,
  handle,
  title,
  quote,
  link,
}: {
  avatar: string
  handle: string
  title: string
  quote: string
  link?: string
}) => (
  <div className="p-8 bg-white/80 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm hover:shadow-2xl hover:bg-white dark:hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105">
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img className="w-12 h-12 rounded-xl object-cover" src={avatar} alt={handle} />
          </div>
        </div>
        <div>
          {link ? (
            <a
              href={link}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline transition-colors font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {handle}
            </a>
          ) : (
            <p className="text-blue-500 dark:text-blue-400 font-semibold">{handle}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        </div>
      </div>
      <blockquote className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
        "{quote}"
      </blockquote>
    </div>
  </div>
)

const TestimonialsSection = () => (
  <section className="py-24 px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute top-20 left-32 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-32 right-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl"></div>
    </div>
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-16">
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 mb-8">
          <span className="mr-2">💬</span>
          Customer Success Stories
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
          They're already growing faster
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Join thousands of creators and businesses who've transformed their Bluesky presence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <TestimonialCard
          avatar="/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg"
          handle="@alexisbouchez.com"
          title="Founder"
          quote="Making use of BluePilot is a great way to grow and engage with your audience on Bluesky."
          link="https://bsky.app/profile/alexisbouchez.com"
        />
        <TestimonialCard
          avatar="/images/pdpDemon.jpg"
          handle="@dem...ny.bsky.social"
          title="Content creator"
          quote="I started using the BluePilot to help grow my platform, and honestly, it's been a game changer."
        />
        <TestimonialCard
          avatar="/images/nallanos.jpg"
          handle="@allanbe.bsky.social"
          title="Founder"
          quote="I use the tool myself on a daily basis, and each update is designed to make the experience even smoother."
          link="https://bsky.app/profile/allanbe.bsky.social"
        />
      </div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="border-t border-gray-200 dark:border-gray-800 pt-12 mt-16 bg-white dark:bg-gray-900 transition-colors duration-300">
    <div className="container mx-auto px-4">
      <div className="py-8 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="text-center md:text-left mb-8 md:mb-0">
          <div className="mb-3">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              Bluesky Tools
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2024 Made with ❤️ par{' '}
            <a
              href="https://x.com/Nallan0s"
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              @Nallan0s
            </a>
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
          <div>
            <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/terms"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-4">FAQ</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">
                  Is it really free?
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Yes! During the alpha phase, all features are available at no cost.
                </p>
              </div>
              <div>
                <h4 className="text-blue-500 dark:text-blue-400 font-semibold mb-2">
                  How long does it take to set up?
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Setting up typically takes less than five minutes for most users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
)

// Hook personnalisé pour la gestion du thème
const useTheme = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Vérifier d'abord localStorage, sinon utiliser la préférence système
    const savedTheme = localStorage.getItem('darkMode')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = savedTheme ? savedTheme === 'true' : systemDark

    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())

    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return { darkMode, mounted, toggleTheme }
}

function Home() {
  const { darkMode, mounted, toggleTheme } = useTheme()

  // Éviter le flash avant hydratation
  if (!mounted) {
    return null
  }

  return (
    <>
      <Head title="BluePilot - Social Media Management">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('darkMode');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = savedTheme ? savedTheme === 'true' : systemDark;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Navigation darkMode={darkMode} toggleTheme={toggleTheme} />
        <HeroSection />
        <ProblemSolutionSection />
        <FollowbackSection />
        <AnalyticsSection />
        <RelationshipTrackerSection />
        <DMCampaignSection />
        <VideoSection />
        <TestimonialsSection />
        <Footer />
      </div>
    </>
  )
}

export default Home
