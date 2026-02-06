import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function ValidationResults({ validationData }) {
    if (!validationData) return null;

    const { summary, valid, invalid, preview } = validationData;

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Validation Summary</CardTitle>
                    <CardDescription>
                        Excel file processed with {summary.totalRows} total rows
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-green-600">{summary.validRows}</p>
                                <p className="text-sm text-gray-600">Valid</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                                <p className="text-2xl font-bold text-red-600">{summary.invalidRows}</p>
                                <p className="text-sm text-gray-600">Invalid</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold text-orange-600">{summary.emptyRows}</p>
                                <p className="text-sm text-gray-600">Empty</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">{summary.duplicateEmails}</p>
                                <p className="text-sm text-gray-600">Duplicates</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Valid Participants */}
            {preview && preview.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Preview (First 5 Valid Participants)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {preview.map((participant, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{participant.name}</p>
                                        <p className="text-sm text-gray-600">{participant.email}</p>
                                    </div>
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                        Row {participant.rowNumber}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Validation Errors */}
            {invalid && invalid.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Validation Errors ({invalid.length})</CardTitle>
                        <CardDescription>
                            Fix these issues and re-upload the Excel file
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {invalid.map((participant, index) => (
                                <Alert key={index} variant="destructive" className="border-red-200 bg-red-50">
                                    <AlertDescription>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold mb-1">
                                                    Row {participant.rowNumber}: {participant.name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">{participant.email || 'No email'}</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {participant.errors.map((error, i) => (
                                                        <li key={i} className="text-sm text-red-700">{error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <Badge variant="destructive">Error</Badge>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Success message if all valid */}
            {summary.validRows > 0 && summary.invalidRows === 0 && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                        All {summary.validRows} participants are valid! You can proceed with certificate generation.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
