'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getRelativeTime } from '@/lib/utils';

interface CommunityManageProps {
    pendingRequests: any[];
    onApproveRequest: (requestId: number) => void;
    onRejectRequest: (requestId: number) => void;
}

export function CommunityManage({
    pendingRequests,
    onApproveRequest,
    onRejectRequest,
}: CommunityManageProps) {
    return (
        <TabsContent value="manage" className="mt-0">
            <div className="space-y-6">
                <div>
                    <h2 className="mb-2 text-xl font-semibold">
                        Pending Requests
                    </h2>
                    <p className="text-muted-foreground mb-4 text-sm">
                        Manage join and follow requests for this community
                    </p>

                    {pendingRequests && pendingRequests.length > 0 ? (
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Request Type</TableHead>
                                        <TableHead>Requested At</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={
                                                                request.user
                                                                    ?.image ||
                                                                undefined ||
                                                                '/placeholder.svg'
                                                            }
                                                        />
                                                        <AvatarFallback>
                                                            {request.user?.name
                                                                ?.substring(
                                                                    0,
                                                                    2,
                                                                )
                                                                .toUpperCase() ||
                                                                'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>
                                                        {request.user?.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        request.requestType ===
                                                        'join'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {request.requestType ===
                                                    'join'
                                                        ? 'Join'
                                                        : 'Follow'}
                                                </Badge>
                                                <div className="text-muted-foreground mt-1 text-xs">
                                                    {request.requestType ===
                                                    'join'
                                                        ? 'User wants to become a member'
                                                        : 'User wants to follow posts'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(
                                                    request.requestedAt,
                                                ).toLocaleDateString()}
                                                <div className="text-muted-foreground mt-1 text-xs">
                                                    {getRelativeTime(
                                                        new Date(
                                                            request.requestedAt,
                                                        ),
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            onApproveRequest(
                                                                request.id,
                                                            )
                                                        }
                                                    >
                                                        <CheckCircle className="mr-1 h-4 w-4" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            onRejectRequest(
                                                                request.id,
                                                            )
                                                        }
                                                    >
                                                        <XCircle className="mr-1 h-4 w-4" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground py-8 text-center">
                            No pending requests at this time.
                        </p>
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
