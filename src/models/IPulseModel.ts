export interface IPulseModel {
    id?: number;
    device_id: number;
    pulse: number;
    emitted_at: string | Date;
    created_at?: string | Date;
}

export default IPulseModel;
