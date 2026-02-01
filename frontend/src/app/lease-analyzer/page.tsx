'use client'

import { useState, useRef, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { 
  FileText, Upload, AlertTriangle, CheckCircle, Mail, X, 
  DollarSign, Calendar, Shield, Home, Clock, AlertCircle,
  ThumbsUp, ThumbsDown, Minus, Scale, Key, FileWarning
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const ANALYSIS_STEPS = [
  { label: 'Uploading document', duration: 1500 },
  { label: 'Extracting text from PDF', duration: 2500 },
  { label: 'Analyzing lease terms', duration: 3000 },
  { label: 'Identifying red flags', duration: 2000 },
  { label: 'Calculating financials', duration: 1500 },
  { label: 'Generating recommendations', duration: 2000 },
]

export default function LeaseAnalyzerPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PDF or DOCX file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setUploadedFile(file)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      setError('Please upload a lease document')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setProgress(0)
      setCurrentStep(0)

      // Start progress simulation
      let stepIndex = 0
      const progressInterval = setInterval(() => {
        if (stepIndex < ANALYSIS_STEPS.length) {
          setCurrentStep(stepIndex)
          const progressPerStep = 100 / ANALYSIS_STEPS.length
          const targetProgress = Math.min((stepIndex + 1) * progressPerStep, 95)
          setProgress(prev => Math.min(prev + progressPerStep * 0.8, targetProgress))
          stepIndex++
        }
      }, 2000)

      const formData = new FormData()
      formData.append('file', uploadedFile)
      if (email) formData.append('email', email)

      const response = await fetch(`${API_URL}/api/lease/upload`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Analysis failed')
      }

      setProgress(100)
      setCurrentStep(ANALYSIS_STEPS.length - 1)
      
      const data = await response.json()
      
      // Small delay to show 100% before showing results
      await new Promise(resolve => setTimeout(resolve, 500))
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze lease')
    } finally {
      setLoading(false)
      setProgress(0)
      setCurrentStep(0)
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getRatingConfig = (rating: string) => {
    switch (rating) {
      case 'favorable':
        return { 
          icon: ThumbsUp, 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          border: 'border-green-200',
          label: 'Tenant Favorable'
        }
      case 'concerning':
        return { 
          icon: ThumbsDown, 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          label: 'Concerning Terms'
        }
      default:
        return { 
          icon: Minus, 
          color: 'text-amber-600', 
          bg: 'bg-amber-50', 
          border: 'border-amber-200',
          label: 'Standard Terms'
        }
    }
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'text-red-600', bg: 'bg-red-100', label: 'High Risk' }
      case 'medium':
        return { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Medium' }
      default:
        return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Low' }
    }
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4">
              Analyze your <span className="italic">lease</span>
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Upload your lease and get AI-powered analysis highlighting red flags, unfair clauses, and key terms in plain English.
            </p>
          </div>

          {/* Analyzer Form */}
          {!analysis && (
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft border border-border">
              <div className="space-y-6">
                {/* File Upload Zone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Upload Lease Document
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : uploadedFile
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-card-alt'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-primary" strokeWidth={1.5} />
                        <span className="text-foreground font-medium">{uploadedFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearFile() }}
                          className="p-1 hover:bg-foreground/10 rounded-full transition-colors"
                        >
                          <X size={18} className="text-foreground/60" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto text-foreground/40 mb-3" strokeWidth={1.5} />
                        <p className="text-foreground/70 mb-1">
                          Drag and drop your lease here, or click to browse
                        </p>
                        <p className="text-sm text-foreground/50">
                          PDF or DOCX, up to 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-6 py-4 bg-card-alt rounded-full border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                  <p className="text-sm text-foreground/60 mt-2">
                    We'll send the analysis report to your email
                  </p>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !uploadedFile}
                  className="w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload size={18} strokeWidth={1.5} />
                  {loading ? 'Analyzing...' : 'Upload & Analyze'}
                </button>

                {/* Progress Indicator */}
                {loading && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="relative">
                      <div className="h-2 bg-card-alt rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-foreground/60">
                          {ANALYSIS_STEPS[currentStep]?.label || 'Processing...'}
                        </span>
                        <span className="text-sm font-medium text-primary">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {ANALYSIS_STEPS.map((step, index) => (
                        <div 
                          key={index}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-300 ${
                            index < currentStep 
                              ? 'bg-primary/20 text-primary' 
                              : index === currentStep 
                                ? 'bg-primary text-white' 
                                : 'bg-card-alt text-foreground/40'
                          }`}
                        >
                          {index < currentStep ? (
                            <CheckCircle size={12} strokeWidth={2} />
                          ) : index === currentStep ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-foreground/20" />
                          )}
                          <span className="hidden sm:inline">{step.label}</span>
                          <span className="sm:hidden">Step {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
                    <p className="text-accent text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Debug: Raw API Response */}
              <details className="bg-amber-50 rounded-2xl border border-amber-200">
                <summary className="p-4 cursor-pointer text-sm font-medium text-amber-800">
                  🔍 Debug: View raw API response (click to expand)
                </summary>
                <div className="p-4 pt-0">
                  <pre className="text-xs text-amber-900 whitespace-pre-wrap max-h-64 overflow-auto bg-amber-100 p-4 rounded-xl">
                    {JSON.stringify(analysis, null, 2)}
                  </pre>
                </div>
              </details>              {/* Overall Rating Hero Card */}
              {(() => {
                const ratingConfig = getRatingConfig(analysis.overallRating)
                const RatingIcon = ratingConfig.icon
                return (
                  <div className={`${ratingConfig.bg} rounded-3xl p-8 border-2 ${ratingConfig.border}`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className={`p-4 rounded-2xl ${ratingConfig.bg} border ${ratingConfig.border}`}>
                        <RatingIcon size={48} className={ratingConfig.color} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-4 py-1 rounded-full text-sm font-semibold ${ratingConfig.bg} ${ratingConfig.color} border ${ratingConfig.border}`}>
                            {ratingConfig.label}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3">
                          Lease Analysis Complete
                        </h2>
                        <p className="text-foreground/80 text-lg leading-relaxed">
                          {analysis.summary || 'Your lease has been analyzed'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Financial Summary - Prominent Cards */}
              {analysis.financialSummary && Object.keys(analysis.financialSummary).some(k => analysis.financialSummary[k]) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.financialSummary.totalMoveInCost && (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                          <Key size={20} className="text-primary" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">Move-in Cost</span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{analysis.financialSummary.totalMoveInCost}</p>
                    </div>
                  )}
                  {analysis.financialSummary.monthlyTotal && (
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-6 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500/20 rounded-xl">
                          <DollarSign size={20} className="text-green-600" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">Monthly Total</span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{analysis.financialSummary.monthlyTotal}</p>
                    </div>
                  )}
                  {analysis.financialSummary.annualCost && (
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                          <Calendar size={20} className="text-blue-600" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">Annual Cost</span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{analysis.financialSummary.annualCost}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Red Flags - High Visibility */}
              {analysis.redFlags && analysis.redFlags.length > 0 && (
                <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-2xl">
                      <AlertTriangle size={28} className="text-red-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">
                        Red Flags Found
                      </h3>
                      <p className="text-foreground/60">{analysis.redFlags.length} issue{analysis.redFlags.length > 1 ? 's' : ''} requiring attention</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analysis.redFlags.map((flag: any, index: number) => {
                      const severityConfig = getSeverityConfig(flag.severity || 'low')
                      return (
                        <div key={index} className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
                          <div className="flex items-start gap-4">
                            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-1" strokeWidth={2} />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-foreground text-lg">
                                  {typeof flag === 'string' ? flag : flag.title}
                                </h4>
                                {flag.severity && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig.bg} ${severityConfig.color}`}>
                                    {severityConfig.label}
                                  </span>
                                )}
                              </div>
                              {typeof flag !== 'string' && flag.description && (
                                <p className="text-foreground/70">{flag.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Key Terms Grid */}
              {analysis.keyTerms && Object.keys(analysis.keyTerms).some(k => analysis.keyTerms[k]) && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <FileText size={24} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">
                      Key Lease Terms
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.keyTerms.monthlyRent && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Monthly Rent</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.monthlyRent}</p>
                      </div>
                    )}
                    {analysis.keyTerms.securityDeposit && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Security Deposit</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.securityDeposit}</p>
                      </div>
                    )}
                    {analysis.keyTerms.leaseTerm && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Lease Term</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.leaseTerm}</p>
                      </div>
                    )}
                    {analysis.keyTerms.lateFee && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={16} className="text-amber-500" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Late Fee</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.lateFee}</p>
                      </div>
                    )}
                    {analysis.keyTerms.petPolicy && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Pet Policy</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.petPolicy}</p>
                      </div>
                    )}
                    {analysis.keyTerms.utilities && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Utilities</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.utilities}</p>
                      </div>
                    )}
                    {analysis.keyTerms.parking && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Parking</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.parking}</p>
                      </div>
                    )}
                    {analysis.keyTerms.maintenanceResponsibility && (
                      <div className="p-4 bg-card-alt rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={16} className="text-primary" strokeWidth={2} />
                          <span className="text-sm font-medium text-foreground/60 uppercase">Maintenance</span>
                        </div>
                        <p className="text-foreground font-semibold">{analysis.keyTerms.maintenanceResponsibility}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Important Dates */}
              {analysis.importantDates && analysis.importantDates.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-soft border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <Calendar size={24} className="text-blue-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">
                      Important Dates
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {analysis.importantDates.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-card-alt rounded-xl">
                        <div className="px-3 py-1 bg-blue-100 rounded-lg">
                          <span className="text-blue-700 font-semibold text-sm">{item.date}</span>
                        </div>
                        <p className="text-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two Column: Rights & Obligations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tenant Rights */}
                {analysis.tenantRights && analysis.tenantRights.length > 0 && (
                  <div className="bg-green-50 rounded-3xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-xl">
                        <Shield size={20} className="text-green-600" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">
                        Your Rights
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {analysis.tenantRights.map((right: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                          <span className="text-foreground/80">{right}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Landlord Obligations */}
                {analysis.landlordObligations && analysis.landlordObligations.length > 0 && (
                  <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <Scale size={20} className="text-blue-600" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">
                        Landlord Must
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {analysis.landlordObligations.map((obligation: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                          <span className="text-foreground/80">{obligation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Termination Clauses */}
              {analysis.terminationClauses && analysis.terminationClauses.length > 0 && (
                <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                      <FileWarning size={24} className="text-amber-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">
                        Termination & Exit
                      </h3>
                      <p className="text-foreground/60">What happens if you need to leave early</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysis.terminationClauses.map((clause: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-amber-100">
                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                        <span className="text-foreground/80">{clause}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 border border-primary/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/20 rounded-2xl">
                      <CheckCircle size={24} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">
                        Our Recommendations
                      </h3>
                      <p className="text-foreground/60">Actions to consider before signing</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white/50 rounded-xl">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-foreground/80">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Confirmation */}
              {email && (
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center">
                  <Mail size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-foreground/70">
                    Analysis report sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
              )}

              {/* Debug Info - shows what was extracted */}
              {analysis.fullText && (
                <details className="bg-card-alt rounded-2xl border border-border">
                  <summary className="p-4 cursor-pointer text-sm text-foreground/60 hover:text-foreground">
                    Debug: View extracted text ({analysis.fullText.length} characters)
                  </summary>
                  <div className="p-4 pt-0">
                    <pre className="text-xs text-foreground/50 whitespace-pre-wrap max-h-64 overflow-auto bg-card p-4 rounded-xl">
                      {analysis.fullText.substring(0, 3000)}
                      {analysis.fullText.length > 3000 && '...\n\n[truncated]'}
                    </pre>
                  </div>
                </details>
              )}

              <button
                onClick={() => {
                  setAnalysis(null)
                  setEmail('')
                  clearFile()
                }}
                className="w-full px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                Analyze Another Lease
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}