'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  Mail,
  X,
  DollarSign,
  Calendar,
  Shield,
  Home,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Scale,
  Key,
  FileWarning,
  Image,
  LayoutGrid,
  Star,
  Maximize,
  Lightbulb,
} from 'lucide-react'

import { reportValue } from '@/lib/report-value'
import { api, apiJson } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LeaseAnalyzerPage() {
  const { user } = useAuth()
  const [emailRequested, setEmailRequested] = useState(false)
  const email = emailRequested ? user?.email || '' : ''
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailEnvelope, setEmailEnvelope] = useState<any>(null)
  const [emailRetrying, setEmailRetrying] = useState(false)
  const [partialErrors, setPartialErrors] = useState<Record<string, string>>({})
  const [features, setFeatures] = useState<any>(null)
  const [generatedAt, setGeneratedAt] = useState('')
  useEffect(() => {
    if (user)
      api
        .analysisStatus()
        .then((x) => setFeatures(x.features))
        .catch((e) => setError(e.message))
  }, [user])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null)
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFloorPlan, setIsDraggingFloorPlan] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const floorPlanInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    const allowed = ['application/pdf']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setUploadedFile(file)
    setError(null)
  }

  const handleFloorPlanSelect = (file: File) => {
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Please upload an image file (PNG, JPEG, WebP, or GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setFloorPlanFile(file)
    if (floorPlanPreview) URL.revokeObjectURL(floorPlanPreview)
    setFloorPlanPreview(URL.createObjectURL(file))
    setError(null)
  }

  const clearFloorPlan = () => {
    if (floorPlanPreview) URL.revokeObjectURL(floorPlanPreview)
    setFloorPlanFile(null)
    setFloorPlanPreview(null)
    if (floorPlanInputRef.current) floorPlanInputRef.current.value = ''
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [user],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleAnalyze = async (retryFailed = false) => {
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    if (!uploadedFile && !floorPlanFile) {
      setError('Choose a lease PDF or a floor plan image.')
      return
    }
    try {
      setLoading(true)
      setError(null)
      setEmailSent(false)
      setEmailError('')
      const form = new FormData()
      if (uploadedFile && (!retryFailed || partialErrors.lease)) form.append('lease', uploadedFile)
      if (floorPlanFile && (!retryFailed || partialErrors.floorPlan))
        form.append('floorplan', floorPlanFile)
      form.append('sendEmail', !retryFailed && emailRequested ? 'true' : 'false')
      if (email) form.append('email', email)
      const data = await api.analyzeDocuments(form)
      // The renderer uses lease fields at the top level and a separate floorPlan object.
      setAnalysis((previous: any) => ({
        ...(retryFailed ? previous : {}),
        ...data.analysis.lease,
        ...(data.analysis.floorPlan ? { floorPlan: data.analysis.floorPlan } : {}),
      }))
      setPartialErrors(data.errors || {})
      setEmailSent(data.emailSent === true)
      setEmailError(data.emailError || '')
      setGeneratedAt(data.generatedAt)
      setEmailEnvelope((previous: any) =>
        data.receipt
          ? {
              parts: [
                ...(retryFailed ? previous?.parts || [] : []),
                { analysis: data.analysis, receipt: data.receipt },
              ].slice(-2),
            }
          : null,
      )
      if (retryFailed && emailRequested && !data.partial)
        setEmailError('The analysis is complete. Use Retry email to send the completed report.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  async function retryEmail() {
    if (!emailEnvelope || emailRetrying) return
    setEmailRetrying(true)
    try {
      const result = await apiJson(
        '/api/property/email',
        { method: 'POST', body: JSON.stringify(emailEnvelope) },
        45000,
      )
      setEmailSent(result.emailSent === true)
      setEmailError(result.emailError || '')
    } catch (e) {
      setEmailError((e as Error).message)
    } finally {
      setEmailRetrying(false)
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
          label: 'Tenant Favorable',
        }
      case 'concerning':
        return {
          icon: ThumbsDown,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Concerning Terms',
        }
      default:
        return {
          icon: Minus,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          label: 'Standard Terms',
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
              Analyze your <span className="italic">property</span>
            </h1>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Upload your lease and floor plan for AI-powered analysis. Review extracted lease terms
              and floor plan observations, with missing details clearly marked.
            </p>
          </div>

          {!user && (
            <div role="status" className="mb-6 rounded-2xl border border-border bg-card p-5">
              Sign in before uploading documents.{' '}
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
                ? 'Use Sign In in the navigation.'
                : 'Google sign-in is not configured in this environment.'}
            </div>
          )}
          {user && features && (!features.leaseAnalysis || !features.floorPlanAnalysis) && (
            <p role="status" className="mb-6 rounded-xl bg-amber-50 p-4">
              {!features.leaseAnalysis && 'Lease analysis is not configured. '}
              {!features.floorPlanAnalysis && 'Floor plan analysis is not configured. '}Your files
              will stay in this form if a request cannot complete.
            </p>
          )}
          {error && (
            <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4">
              {error}
            </p>
          )}
          {/* Analyzer Form */}
          {!analysis && (
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft border border-border">
              <div className="space-y-6">
                {/* File Upload Zone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Lease Document (optional)
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    role="button"
                    tabIndex={user ? 0 : -1}
                    aria-label="Choose lease PDF"
                    aria-disabled={!user}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
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
                      aria-label="Lease PDF"
                      ref={fileInputRef}
                      type="file"
                      disabled={!user || loading}
                      accept=".pdf,application/pdf"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-primary" strokeWidth={1.5} />
                        <span className="text-foreground font-medium">{uploadedFile.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            clearFile()
                          }}
                          className="p-1 hover:bg-foreground/10 rounded-full transition-colors"
                        >
                          <X size={18} className="text-foreground/60" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText
                          size={32}
                          className="mx-auto text-foreground/40 mb-3"
                          strokeWidth={1.5}
                        />
                        <p className="text-foreground/70 mb-1">
                          Drag and drop your lease here, or click to browse
                        </p>
                        <p className="text-sm text-foreground/50">PDF, up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Floor Plan Upload Zone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Floor Plan Image (optional)
                  </label>
                  <div
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDraggingFloorPlan(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFloorPlanSelect(file)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDraggingFloorPlan(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setIsDraggingFloorPlan(false)
                    }}
                    role="button"
                    tabIndex={user ? 0 : -1}
                    aria-label="Choose floor plan image"
                    aria-disabled={!user}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        floorPlanInputRef.current?.click()
                      }
                    }}
                    onClick={() => floorPlanInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDraggingFloorPlan
                        ? 'border-blue-500 bg-blue-500/5'
                        : floorPlanFile
                          ? 'border-blue-500/50 bg-blue-500/5'
                          : 'border-border hover:border-blue-500/50 hover:bg-card-alt'
                    }`}
                  >
                    <input
                      aria-label="Floor plan image"
                      ref={floorPlanInputRef}
                      type="file"
                      disabled={!user || loading}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFloorPlanSelect(e.target.files[0])
                      }
                      className="hidden"
                    />
                    {floorPlanFile ? (
                      <div className="flex flex-col items-center gap-3">
                        {floorPlanPreview && (
                          <img
                            src={floorPlanPreview}
                            alt="Floor plan preview"
                            className="max-h-32 rounded-xl border border-border"
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <Image size={20} className="text-blue-500" strokeWidth={1.5} />
                          <span className="text-foreground font-medium">{floorPlanFile.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              clearFloorPlan()
                            }}
                            className="p-1 hover:bg-foreground/10 rounded-full transition-colors"
                          >
                            <X size={18} className="text-foreground/60" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Image
                          size={32}
                          className="mx-auto text-foreground/40 mb-3"
                          strokeWidth={1.5}
                        />
                        <p className="text-foreground/70 mb-1">
                          Drag and drop your floor plan here, or click to browse
                        </p>
                        <p className="text-sm text-foreground/50">
                          PNG, JPEG, WebP, or GIF, up to 10MB
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
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={emailRequested}
                      onChange={(e) => setEmailRequested(e.target.checked)}
                      disabled={!user}
                    />
                    Email a copy to {user?.email || 'your signed-in address'}
                  </label>
                  <p className="mt-2 text-sm text-foreground/60">
                    Email status will appear after analysis. Sending requires a configured email
                    service.
                  </p>
                </div>

                <button
                  onClick={() => handleAnalyze()}
                  disabled={!user || loading || (!uploadedFile && !floorPlanFile)}
                  className="w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload size={18} strokeWidth={1.5} />
                  {loading
                    ? 'Analyzing...'
                    : uploadedFile && floorPlanFile
                      ? 'Analyze Both'
                      : 'Analyze'}
                </button>

                {loading && (
                  <div role="status" className="rounded-2xl bg-primary/10 p-5">
                    Analyzing your documents… Waiting for the analysis services. This may take up to
                    three minutes.
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
              {analysis?.limitations?.map((note: unknown, i: number) => (
                <p key={i} role="note" className="rounded-xl bg-amber-50 p-4 text-sm">
                  {reportValue(note)}
                </p>
              ))}
              {analysis.financialSummary?.calculationBasis && (
                <p className="text-sm text-foreground/65">
                  {reportValue(analysis.financialSummary.calculationBasis)}
                </p>
              )}
              <p className="text-sm text-foreground/65">
                Document analysis ·{' '}
                {generatedAt ? new Date(generatedAt).toLocaleString() : 'Date unavailable'}.
                Observations are based on your uploaded files; unreported terms remain unknown.
              </p>
              {Object.keys(partialErrors).length > 0 && (
                <div role="alert" className="rounded-xl bg-amber-50 p-5">
                  <p>Partial analysis: {Object.values(partialErrors).join(' ')}</p>
                  <button
                    disabled={loading}
                    className="mt-3 underline"
                    onClick={() => handleAnalyze(true)}
                  >
                    {loading ? 'Retrying…' : 'Retry failed analysis'}
                  </button>
                </div>
              )}
              {emailError && (
                <div role="alert" className="rounded-xl bg-amber-50 p-4">
                  <p>Email not confirmed: {emailError}</p>
                  {emailEnvelope && Object.keys(partialErrors).length === 0 && (
                    <button
                      disabled={emailRetrying}
                      onClick={retryEmail}
                      className="mt-3 underline"
                    >
                      {emailRetrying ? 'Retrying email…' : 'Retry email'}
                    </button>
                  )}
                </div>
              )}
              {analysis.summary && !analysis.overallRating && (
                <section className="rounded-3xl border border-border bg-card p-8">
                  <h2 className="font-serif text-2xl">Lease Analysis</h2>
                  <p className="mt-4">{reportValue(analysis.summary)}</p>
                  <p className="mt-3 text-sm">Overall rating not determined.</p>
                </section>
              )}
              {/* Floor Plan Analysis Results */}
              {(analysis.floorPlan || analysis.layout) && (
                <div className="bg-blue-50 rounded-3xl p-8 border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <LayoutGrid size={28} className="text-blue-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">
                        Floor Plan Analysis
                      </h3>
                      <p className="text-foreground/60">AI-powered layout insights</p>
                    </div>
                  </div>

                  {/* Layout Stats */}
                  {(analysis.floorPlan?.layout || analysis.layout) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {(() => {
                        const layout = analysis.floorPlan?.layout || analysis.layout
                        return (
                          <>
                            <div className="bg-white rounded-xl p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600">
                                {layout.bedrooms ?? 'Unknown'}
                              </p>
                              <p className="text-sm text-foreground/60">Bedrooms</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600">
                                {layout.bathrooms ?? 'Unknown'}
                              </p>
                              <p className="text-sm text-foreground/60">Bathrooms</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600">
                                {layout.totalRooms ?? 'Unknown'}
                              </p>
                              <p className="text-sm text-foreground/60">Total Rooms</p>
                            </div>
                            {layout.estimatedSquareFeet && (
                              <div className="bg-white rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600">
                                  {layout.estimatedSquareFeet}
                                </p>
                                <p className="text-sm text-foreground/60">Est. Sq Ft</p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* Space Efficiency */}
                  {(analysis.floorPlan?.spaceEfficiency || analysis.spaceEfficiency) && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3">
                        <Maximize size={18} className="text-blue-600" />
                        <span className="font-medium text-foreground">Space Efficiency:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            (analysis.floorPlan?.spaceEfficiency || analysis.spaceEfficiency) ===
                            'Excellent'
                              ? 'bg-green-100 text-green-700'
                              : (analysis.floorPlan?.spaceEfficiency ||
                                    analysis.spaceEfficiency) === 'Good'
                                ? 'bg-blue-100 text-blue-700'
                                : (analysis.floorPlan?.spaceEfficiency ||
                                      analysis.spaceEfficiency) === 'Fair'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {analysis.floorPlan?.spaceEfficiency || analysis.spaceEfficiency}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {(analysis.floorPlan?.summary || analysis.summary) &&
                    !analysis.overallAssessment && (
                      <p className="text-foreground/80 mb-6 p-4 bg-white rounded-xl">
                        {analysis.floorPlan?.summary || analysis.summary}
                      </p>
                    )}

                  {/* Features */}
                  {(analysis.floorPlan?.features || analysis.features) &&
                    (analysis.floorPlan?.features || analysis.features).length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-foreground mb-3">Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {(analysis.floorPlan?.features || analysis.features).map(
                            (feature: string, i: number) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 bg-white rounded-full text-sm text-foreground/80 border border-blue-100"
                              >
                                {reportValue(feature)}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(analysis.floorPlan?.pros || analysis.pros) &&
                      (analysis.floorPlan?.pros || analysis.pros).length > 0 && (
                        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                          <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <ThumbsUp size={16} /> Pros
                          </h4>
                          <ul className="space-y-2">
                            {(analysis.floorPlan?.pros || analysis.pros).map(
                              (pro: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-green-800"
                                >
                                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                                  {reportValue(pro)}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    {(analysis.floorPlan?.cons || analysis.cons) &&
                      (analysis.floorPlan?.cons || analysis.cons).length > 0 && (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                          <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <ThumbsDown size={16} /> Cons
                          </h4>
                          <ul className="space-y-2">
                            {(analysis.floorPlan?.cons || analysis.cons).map(
                              (con: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                  {reportValue(con)}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>

                  {/* Floor Plan Recommendations */}
                  {(analysis.floorPlan?.recommendations || analysis.recommendations) &&
                    (analysis.floorPlan?.recommendations || analysis.recommendations).length > 0 &&
                    !analysis.overallAssessment && (
                      <div className="mt-6 p-4 bg-blue-100/50 rounded-xl">
                        <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                          <Lightbulb size={16} /> Layout Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {(analysis.floorPlan?.recommendations || analysis.recommendations).map(
                            (rec: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                                <span className="flex-shrink-0 w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold">
                                  {i + 1}
                                </span>
                                {reportValue(rec)}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Overall Rating Hero Card - Only show for lease-only analysis */}
              {analysis.overallRating &&
                !analysis.overallAssessment &&
                (() => {
                  const ratingConfig = getRatingConfig(analysis.overallRating)
                  const RatingIcon = ratingConfig.icon
                  return (
                    <div
                      className={`${ratingConfig.bg} rounded-3xl p-8 border-2 ${ratingConfig.border}`}
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div
                          className={`p-4 rounded-2xl ${ratingConfig.bg} border ${ratingConfig.border}`}
                        >
                          <RatingIcon size={48} className={ratingConfig.color} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-4 py-1 rounded-full text-sm font-semibold ${ratingConfig.bg} ${ratingConfig.color} border ${ratingConfig.border}`}
                            >
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
              {analysis.financialSummary?.calculationBasis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.financialSummary.totalMoveInCost && (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                          <Key size={20} className="text-primary" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                          Rent + Deposit
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {reportValue(analysis.financialSummary.totalMoveInCost)}
                      </p>
                    </div>
                  )}
                  {analysis.financialSummary.monthlyTotal && (
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-6 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500/20 rounded-xl">
                          <DollarSign size={20} className="text-green-600" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                          Monthly Rent
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {reportValue(analysis.financialSummary.monthlyTotal)}
                      </p>
                    </div>
                  )}
                  {analysis.financialSummary.annualCost && (
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                          <Calendar size={20} className="text-blue-600" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                          Annualized Rent
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {reportValue(analysis.financialSummary.annualCost)}
                      </p>
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
                      <p className="text-foreground/60">
                        {analysis.redFlags.length} issue{analysis.redFlags.length > 1 ? 's' : ''}{' '}
                        requiring attention
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analysis.redFlags.map((flag: any, index: number) => {
                      const severityConfig = getSeverityConfig(flag.severity || 'low')
                      return (
                        <div
                          key={index}
                          className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <AlertCircle
                              size={20}
                              className="text-red-500 flex-shrink-0 mt-1"
                              strokeWidth={2}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-foreground text-lg">
                                  {typeof flag === 'string' ? flag : flag.title}
                                </h4>
                                {flag.severity && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig.bg} ${severityConfig.color}`}
                                  >
                                    {severityConfig.label}
                                  </span>
                                )}
                              </div>
                              {typeof flag !== 'string' && flag.description && (
                                <p className="text-foreground/70">
                                  {reportValue(flag.description)}
                                </p>
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
              {analysis.keyTerms &&
                Object.keys(analysis.keyTerms).some((k) => analysis.keyTerms[k]) && (
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
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Monthly Rent
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.monthlyRent)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.securityDeposit && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Security Deposit
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.securityDeposit)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.leaseTerm && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Lease Term
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.leaseTerm)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.lateFee && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-amber-500" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Late Fee
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.lateFee)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.petPolicy && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Home size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Pet Policy
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.petPolicy)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.utilities && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Home size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Utilities
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.utilities)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.parking && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Home size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Parking
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.parking)}
                          </p>
                        </div>
                      )}
                      {analysis.keyTerms.maintenanceResponsibility && (
                        <div className="p-4 bg-card-alt rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Home size={16} className="text-primary" strokeWidth={2} />
                            <span className="text-sm font-medium text-foreground/60 uppercase">
                              Maintenance
                            </span>
                          </div>
                          <p className="text-foreground font-semibold">
                            {reportValue(analysis.keyTerms.maintenanceResponsibility)}
                          </p>
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
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-card-alt rounded-xl"
                      >
                        <div className="px-3 py-1 bg-blue-100 rounded-lg">
                          <span className="text-blue-700 font-semibold text-sm">
                            {reportValue(item.date)}
                          </span>
                        </div>
                        <p className="text-foreground">{reportValue(item.description)}</p>
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
                        Tenant Terms to Review
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {analysis.tenantRights.map((right: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle
                            size={18}
                            className="text-green-600 flex-shrink-0 mt-0.5"
                            strokeWidth={2}
                          />
                          <span className="text-foreground/80">{reportValue(right)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Landlord Terms to Review */}
                {analysis.landlordObligations && analysis.landlordObligations.length > 0 && (
                  <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <Scale size={20} className="text-blue-600" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">
                        Landlord Terms to Review
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {analysis.landlordObligations.map((obligation: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle
                            size={18}
                            className="text-blue-600 flex-shrink-0 mt-0.5"
                            strokeWidth={2}
                          />
                          <span className="text-foreground/80">{reportValue(obligation)}</span>
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
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-white rounded-xl border border-amber-100"
                      >
                        <AlertCircle
                          size={18}
                          className="text-amber-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-foreground/80">{reportValue(clause)}</span>
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
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-white/50 rounded-xl"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-foreground/80">{reportValue(rec)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Confirmation */}
              {emailSent && (
                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-center">
                  <Mail size={24} className="text-primary mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-foreground/70">
                    Email provider accepted the analysis report for{' '}
                    <span className="font-semibold text-foreground">{email}</span>
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
                  setEmailRequested(false)
                  clearFile()
                  clearFloorPlan()
                }}
                className="w-full px-8 py-4 bg-transparent text-primary border border-primary rounded-full text-sm tracking-widest uppercase hover:bg-primary hover:text-background transition-all duration-300"
              >
                Analyze Another Property
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
