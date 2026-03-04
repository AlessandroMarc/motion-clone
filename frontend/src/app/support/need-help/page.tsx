'use client';

import { Mail, MessageCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function NeedHelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Need Help?
          </h1>
          <p className="text-lg text-slate-300">
            Get in touch with support. I'm here to help!
          </p>
        </div>

        {/* Support Options */}
        <div className="space-y-6 mb-12">
          {/* Email Support */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-blue-500 transition-colors">
            <div className="flex items-start space-x-4">
              <Mail className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Send an Email
                </h2>
                <p className="text-slate-400 mb-4">
                  Have a question or need assistance? Send me an email and I'll get back to you as soon as possible.
                </p>
                <a
                  href="mailto:alessandromarchesin@gmail.com"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Mail className="w-4 h-4" />
                  <span>alessandromarchesin@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <div className="flex items-start space-x-4">
              <Clock className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Response Time
                </h2>
                <p className="text-slate-300">
                  I aim to respond to all inquiries within 24-48 hours. Thank you for your patience!
                </p>
              </div>
            </div>
          </div>

          {/* What to Include */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <div className="flex items-start space-x-4">
              <MessageCircle className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Help Us Help You
                </h2>
                <ul className="text-slate-300 space-y-2">
                  <li>• Describe the issue you're experiencing</li>
                  <li>• Include any error messages you see</li>
                  <li>• Let us know what you were trying to do</li>
                  <li>• Share your browser/device information if applicable</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            <span>← Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
