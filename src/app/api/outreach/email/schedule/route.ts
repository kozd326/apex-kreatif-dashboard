import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Müşteri araştırması ve otomatik iletişim araçları kapatıldı.'},{status:410});}
export const GET=POST;
